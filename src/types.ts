import { Document } from 'mongoose';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Socket } from 'socket.io';

import report from './utils/report';
import TelegramBotExt from './utils/TelegramBotExt';

declare module 'socket.io' {
    class Socket {
        user: IUser;
    }
}

export type Logger = typeof report;

/* -------------------------------------------------------------------------- */
/*                                   Models                                   */
/* -------------------------------------------------------------------------- */

/** Excludes keys of Document from T  */
export type Shape<T> = Record<keyof Omit<T, keyof Document>, any>;

export interface IUser extends Document {
    telegramId: number;
    chatId: number;
    username: string;
    token: string;
    ban: {
        isBanned: boolean;
        reason: string;
    };
    whitelist: Array<string>;
}

export interface IAlias extends Document {
    userId: string;
    alias: string;
    socketId: string;
}

/* -------------------------------------------------------------------------- */
/*                                     Bot                                    */
/* -------------------------------------------------------------------------- */

export const enum BotCommand {
    START = 'start',
    HELP = 'help',
    INFO = 'info',
    DELETE_DATA = 'deletedata',
    REFRESH_TOKEN = 'refreshtoken',
    WHITELIST = 'whitelist',
    REPLY = 'r',
}

export const enum BotQueryCode {
    CONFIRM_DELETION = 'confirm_deletion',
    ABORT = 'abort_keyboard_action',
    CONFIRM_REFRESH_TOKEN = 'confirm_refresh_token',
}

export type BotResponse = ReturnType<typeof TelegramBotExt.prototype.response>;

export type BotCommandController = (message: MessageExt, response: BotResponse) => any;
export type BotCommandMiddleware = (
    message: MessageExt,
    response: BotResponse,
    next: (error?: Error) => any,
) => any | Promise<any>;

export type QueryResponseOptions = Omit<TelegramBot.AnswerCallbackQueryOptions, 'callback_query_id'> & {
    deleteMessage?: boolean;
    deleteInlineKeyboard?: boolean;
};

export type BotQueryCallback = (
    request: {
        from: TelegramBot.User;
        message: Message;
        data: Array<any>;
    },
    queryResponse: (options: QueryResponseOptions) => Promise<boolean>,
    chatResponse: BotResponse,
) => any | Promise<any>;

/* -------------------------------------------------------------------------- */
/*                                   Socket                                   */
/* -------------------------------------------------------------------------- */

export const enum SocketEvent {
    MESSAGE = 'message',
    DISCONNECT = 'disconnect',
    TEST = 'test_ping',
}

export interface MessageExt extends Message {
    from: TelegramBot.User;
    user: IUser;
    text: string;
}

export type SocketController = (socket: Socket, payload: any) => Promise<any> | any;
export type SocketMiddleware = (socket: Socket, next: (error?: Error) => void) => Promise<any> | any;

/* -------------------------------------------------------------------------- */
/*                                     JWT                                    */
/* -------------------------------------------------------------------------- */

export interface AuthTokenPayload {
    id: string;
}

export function isAuthTokenPayload(payload: any): payload is AuthTokenPayload {
    if (!!payload && typeof payload.id === 'string') return true;
    else return false;
}

/* -------------------------------------------------------------------------- */
/*                                  Collector                                 */
/* -------------------------------------------------------------------------- */

export const enum CollectorEvent {
    SOCKET_MESSAGE = 'socket_message',
    BOT_MESSAGE = 'bot_message',
    DISCONNECT = 'disconnect',
}

export interface SocketMessageEventPayload {
    userId: string;
    chatId: number;
    alias: string;
    message: string;
}

export interface BotMessageEventPayload {
    userId: string;
    socketId: string;
    message: string;
}

export interface DisconnectEventPayload {
    socketId: string;
    userId: string;
    chatId: number;
    reason?: string;
}
