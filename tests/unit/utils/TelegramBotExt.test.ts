/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: TelegramBotExt class
 * Tests:
 * - Behavior
 * - Data consistency
 *
 * -------------------------------------------------------------------------- */

import TelegramBot from 'node-telegram-bot-api';

import { StructureOf } from '@Tests/types';
import { BotCommand, BotCommandMiddleware, BotQueryCode, Logger, MessageExt } from '@App/types';
import report from '@App/utils/report';
import TelegramBotExt from '@App/utils/TelegramBotExt';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockTelegramBotConstructor = jest.fn();
const mockSendMethods = jest.fn();
const mockOn = jest.fn();
const mockAnswerCallbackQuery = jest.fn();
const mockDeleteMessage = jest.fn();
const mockEditMessageReplyMarkup = jest.fn();
const mockOnText = jest.fn();
jest.mock(
    'node-telegram-bot-api',
    () =>
        class {
            constructor(...args) {
                mockTelegramBotConstructor(args);
            }
            sendMessage(...args) {
                mockSendMethods(args);
            }
            sendPhoto(...args) {
                mockSendMethods(args);
            }
            sendVideo(...args) {
                mockSendMethods(args);
            }
            on(...args) {
                mockOn(args);
            }
            onText(...args) {
                mockOnText(args);
            }
            answerCallbackQuery(...args) {
                mockAnswerCallbackQuery(args);
            }
            deleteMessage(...args) {
                mockDeleteMessage(args);
            }
            editMessageReplyMarkup(...args) {
                mockEditMessageReplyMarkup(args);
            }
        },
);

const mockMessage: StructureOf<MessageExt> = {
    message_id: 'mock_messageId',
    from: {
        id: 'mock_telegramId',
    },
    chat: {
        id: 'mock_chatId',
    },
};

const mockQuery: StructureOf<TelegramBot.CallbackQuery> = {
    message: mockMessage,
    data: JSON.stringify([BotQueryCode.CONFIRM_DELETION, 'other_data']),
    id: 'mock_queryId',
    from: {
        id: 'mock_telegramId',
    },
};

/* -------------------------------------------------------------------------- */
/*                              Bridge operations                             */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
    jest.clearAllMocks();
});

/* -------------------------------------------------------------------------- */
/*                              Wrapper function                              */
/* -------------------------------------------------------------------------- */

/**
 * Create a TelegramBotExt instance with the provided args
 * @param token Override token
 * @param options Override options
 */
const run = (
    token = 'mock_token',
    options: TelegramBot.ConstructorOptions & { logger?: Logger } = { logger: report },
) => {
    return new TelegramBotExt(token, options);
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    describe('onCommand method', () => {
        it('adds an "onText" listener', () => {
            const instance = run();

            instance.onCommand(BotCommand.INFO, () => undefined);

            expect(mockOnText).toBeCalledTimes(1);
        });
        it('calls callback on event', async () => {
            const callback = jest.fn();

            const instance = run();
            instance.onCommand(BotCommand.INFO, callback);

            // Emulate incoming message event
            await mockOnText.mock.calls[0][0][1](mockMessage);

            expect(callback).toBeCalledTimes(1);
        });
        it('calls middlewares before executing callback on event', async () => {
            const middleware = jest.fn();
            const callback = jest.fn();

            const instance = run();
            instance.use(middleware);
            instance.onCommand(BotCommand.INFO, callback);

            // Emulate incoming message event
            await mockOnText.mock.calls[0][0][1](mockMessage);

            expect(middleware).toBeCalledTimes(1);
        });
        it('calls sendMessage itself on event but a middleware throws an error', async () => {
            const middleware = (_msg, _res, next) => {
                return next(new Error('text reply'));
            };
            const callback = jest.fn();

            const instance = run();
            instance.use(middleware);
            instance.onCommand(BotCommand.INFO, callback);

            // Emulate incoming message event
            await mockOnText.mock.calls[0][0][1](mockMessage);

            expect(mockSendMethods).toBeCalledTimes(1);
        });
        it('does not call callback if a middleware throws an error', async () => {
            const middleware = (_msg, _res, next) => {
                return next(new Error('text reply'));
            };
            const callback = jest.fn();

            const instance = run();
            instance.use(middleware);
            instance.onCommand(BotCommand.INFO, callback);

            // Emulate incoming message event
            await mockOnText.mock.calls[0][0][1](mockMessage);

            expect(callback).not.toBeCalled();
        });
    });

    describe('onQuery method', () => {
        it('adds an "on" listener', () => {
            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, () => undefined);

            expect(mockOn).toBeCalledTimes(1);
        });
        it('calls callback on event', async () => {
            const callback = jest.fn();

            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, callback);

            // Emulate incoming callback_query event
            await mockOn.mock.calls[0][0][1](mockQuery);

            expect(callback).toBeCalledTimes(1);
        });
        it('calls answerCallbackQuery on event if an error occurs', async () => {
            const callback = jest.fn();

            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, callback);

            // Emulate incoming callback_query event
            await mockOn.mock.calls[0][0][1]({ ...mockQuery, data: JSON.stringify('not an array') });

            expect(mockAnswerCallbackQuery).toBeCalledTimes(1);
        });
        it('does not call callback if an error occurs', async () => {
            const callback = jest.fn();

            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, callback);

            // Emulate incoming callback_query event
            await mockOn.mock.calls[0][0][1]({ ...mockQuery, data: JSON.stringify('not an array') });

            expect(callback).toBeCalledTimes(0);
        });
    });
});

describe('Data consistency', () => {
    describe('Constructor', () => {
        it('calls superclass constructor with correct args on instantiation', () => {
            run(undefined, { filepath: true });

            expect(mockTelegramBotConstructor).toBeCalledTimes(1);
            expect(mockTelegramBotConstructor).toBeCalledWith(['mock_token', { filepath: true }]);
        });
        it('assigns logger property if provided', () => {
            // @ts-expect-error ignore illegal type
            const instance = run(undefined, { logger: 'this is a logger object' });

            // @ts-expect-error logger is a private prop
            expect(instance.logger).toBe('this is a logger object');
        });
    });

    describe('use method', () => {
        it('assigns middlewares in the correct order', () => {
            const xMiddleware: BotCommandMiddleware = () => 'x';
            const yMiddleware: BotCommandMiddleware = () => 'y';

            const instance = run();

            instance.use(xMiddleware);
            // @ts-expect-error middlewares is a private prop
            expect(instance.middlewares).toEqual([xMiddleware]);

            instance.use(yMiddleware);
            // @ts-expect-error middlewares is a private prop
            expect(instance.middlewares).toEqual([xMiddleware, yMiddleware]);

            instance.use(yMiddleware, xMiddleware);
            // @ts-expect-error middlewares is a private prop
            expect(instance.middlewares).toEqual([xMiddleware, yMiddleware, yMiddleware, xMiddleware]);
        });
    });

    describe('onCommand method', () => {
        it('adds onText listener with the correct regex', () => {
            const instance = run();

            instance.onCommand(BotCommand.INFO, () => 'x');

            expect(mockOnText).toBeCalledTimes(1);
            expect(mockOnText.mock.calls[0][0][0]).toEqual(/^\/info\s*/);
        });
        it('adds onText listener with the correct regex if exact is true', () => {
            const instance = run();

            instance.onCommand(BotCommand.INFO, () => 'x', { exact: true });

            expect(mockOnText).toBeCalledTimes(1);
            expect(mockOnText.mock.calls[0][0][0]).toEqual(/^\/info\s*$/);
        });
        it('calls the controller callback with valid args', async () => {
            const callback = jest.fn();

            const instance = run();
            instance.onCommand(BotCommand.INFO, callback);

            expect(mockOnText).toBeCalledTimes(1);
            await mockOnText.mock.calls[0][0][1](mockMessage);

            expect(callback).toBeCalledTimes(1);
            callback.mock.calls[0][0];
            expect(callback.mock.calls[0][0]).toEqual(mockMessage);
            expect(typeof callback.mock.calls[0][1] === 'function').toBeTruthy;
        });
    });

    describe('onQuery method', () => {
        it('adds "on" listener with the correct event name', () => {
            const callback = jest.fn();

            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, callback);

            expect(mockOn.mock.calls[0][0][0]).toBe('callback_query');
        });
        it('calls callback with the correct args', () => {
            const callback = jest.fn();

            const instance = run();
            instance.onQuery(BotQueryCode.CONFIRM_DELETION, callback);

            mockOn.mock.calls[0][0][1](mockQuery);

            expect(callback).toBeCalledTimes(1);
            expect(callback.mock.calls[0][0]).toEqual({
                message: mockQuery.message,
                from: mockQuery.from,
                data: JSON.parse(mockQuery.data).slice(0),
            });
        });
    });
});
