import { Stream } from 'stream';
import TelegramBot from 'node-telegram-bot-api';
import {
    BotCommand,
    BotCommandController,
    BotCommandMiddleware,
    BotQueryCallback,
    BotQueryCode,
    Logger,
    MessageExt,
    QueryResponseOptions,
} from '../types';
import { Category } from './report';

class TelegramBotExt extends TelegramBot {
    private middlewares: Array<BotCommandMiddleware> = [];
    private logger: Logger | undefined;

    constructor(token: string, options: TelegramBot.ConstructorOptions & { logger?: Logger }) {
        super(token, options);

        this.logger = options.logger;
    }

    /**
     * Bind the TelegramBot send* methods with the chat ID of the sender
     * @param chatId
     */
    public response(chatId: number) {
        return {
            sendMessage: (text: string, options?: TelegramBot.SendMessageOptions) => {
                return this.sendMessage(chatId, text, options);
            },
            sendPhoto: (photo: string | Stream | Buffer, options?: TelegramBot.SendPhotoOptions) => {
                return this.sendPhoto(chatId, photo, options);
            },
            sendVideo: (video: string | Stream | Buffer, options?: TelegramBot.SendVideoOptions) => {
                return this.sendVideo(chatId, video, options);
            },
        };
    }

    /**
     * Apply middlewares to commands in an Express-like way
     * @param middlewares A callback who provide the message and the bound send* methods
     */
    use(...middlewares: Array<BotCommandMiddleware>): void {
        middlewares.forEach((callback) => this.middlewares.push(callback));
    }

    /**
     * Run all currently registered middlewares
     * @param message The message provided by onText listener
     */
    private runMiddlewares(message: MessageExt): Promise<void> | void | Error {
        let i = 0;
        const response = this.response(message.chat.id);

        const runNext = (callback: BotCommandMiddleware): Promise<void> | void | Error => {
            const next = (error?: Error) => {
                if (error) return error;
                if (i < this.middlewares.length) return runNext(this.middlewares[i++]);
            };

            return callback(message, response, next);
        };

        if (this.middlewares.length) return runNext(this.middlewares[i++]);
    }

    /**
     * Add a listener for a specific command
     * @param command Command text (without /)
     * @param callback a BotCommandController callback
     */
    public onCommand(command: BotCommand, callback: BotCommandController, options?: { exact: boolean }) {
        const regex = new RegExp(`^\/${command}\\s*${options?.exact ? '$' : ''}`);

        this.onText(regex, async (message) => {
            const messageExt = message as MessageExt;

            const error = await this.runMiddlewares(messageExt);

            if (error) {
                this.sendMessage(messageExt.from.id, error.message);
            } else {
                callback(messageExt, this.response(messageExt.from.id));
            }
        });
    }

    /**
     * Add a listener for a specific QueryCallback
     * @param code The first element of the "callback_data" string array in inline_keyboard
     * @param callback a BotQueryCallback callback
     */
    public onQuery(code: BotQueryCode, callback: BotQueryCallback) {
        this.on('callback_query', (query) => {
            const { message, data, id, from } = query;
            const telegramId = message?.from?.id;
            let dataReply: Array<any>;

            if (typeof telegramId === 'undefined' || typeof message === 'undefined' || typeof data === 'undefined') {
                return this.answerCallbackQuery(id, { text: 'Internal error' });
            }

            try {
                dataReply = JSON.parse(data);
            } catch (error) {
                this.logger?.error({
                    category: Category.BOT,
                    description: 'data_callback malformed',
                    origin: {
                        module: __filename,
                    },
                    details: data,
                });
                return this.answerCallbackQuery(id, { text: 'Internal error' });
            }

            if (!Array.isArray(dataReply)) {
                this.logger?.error({
                    category: Category.BOT,
                    description: 'data_callback is not an array',
                    origin: {
                        module: __filename,
                    },
                    details: dataReply,
                });
                return this.answerCallbackQuery(id, { text: 'Internal error' });
            }

            const parsed = dataReply[0];
            const args = dataReply.slice(0);

            if (typeof parsed !== 'string') {
                this.logger?.error({
                    category: Category.BOT,
                    description: 'First element of data_callback must be an array',
                    origin: {
                        module: __filename,
                    },
                    details: parsed,
                });
                return this.answerCallbackQuery(id, { text: 'Internal error' });
            }

            if (parsed === code) {
                const queryResponse = (options: QueryResponseOptions) => {
                    if (options.deleteMessage) {
                        //@ts-expect-error node-telegram-bot-api bug, message_id is an int
                        this.deleteMessage(message.chat.id, message.message_id);
                    } else if (options.deleteInlineKeyboard) {
                        this.editMessageReplyMarkup(
                            { inline_keyboard: [] },
                            {
                                chat_id: message.chat.id,
                                message_id: message.message_id,
                            },
                        );
                    }

                    return this.answerCallbackQuery(id, options);
                };

                callback({ message, from, data: args }, queryResponse, this.response(message.chat.id));
            }
        });
    }
}

export default TelegramBotExt;
