/* ------------------------- Integration test suite ------------------------- *
 *
 * Target: Database communication
 * Tests:
 * - Data validation
 * - App accesses to the database
 * - Data cleaning system
 *
 * -------------------------------------------------------------------------- */

import path from 'path';
import { Server } from 'http';
import dotenv from 'dotenv';
import socketClient from 'socket.io-client';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jsonwebtoken from 'jsonwebtoken';
import TelegramBot from 'node-telegram-bot-api';
import waitFor from 'p-wait-for';
import { mocked } from 'ts-jest/utils';

import startMongoMemoryServer from '@Tests/startMongoMemoryServer';
import { StructureOf } from '@Tests/types';
import Alias from '@App/models/Alias';
import User from '@App/models/User';
import { initLogDatabase } from '@App/utils/report';
import { AuthTokenPayload, BotCommand, BotQueryCode } from '@App/types';

const { DB_NAME, JWT_KEY } = dotenv.config({
    path: path.resolve(__dirname, '..', '..', 'dev.env'),
}).parsed as NodeJS.ProcessEnv;
const DB_HOST = 'localhost';

let App: { default: Server };
let mongoMemoryServer: MongoMemoryServer;

// Use custom ports to avoid conflicts with running instances
process.argv[2] = '3081';
process.env.DB_PORT = '37011';
process.setMaxListeners(20);

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

// Ignore server start messages
console.info = () => undefined;

jest.unmock('jsonwebtoken');

const mockInitLogDb = mocked(initLogDatabase);
jest.mock('@App/utils/report', () => require('@Mocks/report'));

const spyMongooseConnect = jest.spyOn(mongoose, 'connect');
const _connect = mongoose.connect;
// @ts-expect-error ts ignores valid connect() overload
mongoose.connect = jest.fn((_uri, opts) =>
    _connect(`mongodb://${DB_HOST}:${process.env.DB_PORT}/${DB_NAME}`, {
        ...opts,
        user: undefined,
        pass: undefined,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }),
);

let telegramBotInstance;
jest.mock(
    '@App/utils/TelegramBotExt',
    () =>
        class extends jest.requireActual('@App/utils/TelegramBotExt').default {
            constructor(...args) {
                super(...args);
                telegramBotInstance = this;
            }
        },
);

/* -------------------------------------------------------------------------- */
/*                              Bridge operations                             */
/* -------------------------------------------------------------------------- */

beforeAll(async () => {
    mongoMemoryServer = await startMongoMemoryServer(parseInt(process.env.DB_PORT));

    jest.isolateModules(() => {
        App = require('@App/index');
    });

    const isListening = new Promise<void>((res) => {
        App.default.on('listening', res);
    });

    // Wait for module promises to be fulfilled
    await Promise.all([spyMongooseConnect.mock.results[0]?.value, mockInitLogDb.mock.results[0]?.value, isListening]);
}, /* fetch mongo binaries */ 60000);

afterAll(() => {
    App?.default.close();
    mongoMemoryServer?.stop();
    mongoose.disconnect().catch();
});

beforeEach(() => {
    jest.clearAllMocks();
});

/* -------------------------------------------------------------------------- */
/*                              Wrapper function                              */
/* -------------------------------------------------------------------------- */
/**
 * Emulate incoming updates mocking note-telegram-bot-api polling system
 * @param updates Fake Telegram updates
 */
const run = (updates) => {
    require('@Mocks/request-promise')({
        __setUpdates: [
            {
                update_id: 1,
                ...updates,
            },
        ],
    });
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Users', () => {
    it('creates a new user on start command', async () => {
        const startMessage: TelegramBot.Message = {
            from: {
                id: 3456,
                first_name: 'test',
                username: 'test',
                is_bot: false,
            },
            chat: {
                id: 1234,
                type: 'private',
            },
            date: new Date().getTime(),
            message_id: 2345,
            text: '/start',
        };

        run({ message: startMessage });

        const payload = await new Promise((res) => {
            telegramBotInstance.onCommand(BotCommand.START, res);
        });
        const user = await User.findOne({ telegramId: 3456 }).exec();

        expect(payload).toEqual(startMessage);
        expect(user).toBeTruthy();
    });
    it('validates new users', async () => {
        try {
            await User.create({
                telegramId: 'not_a_number',
                username: 123,
            });
        } catch (error) {
            expect(error.message).toContain('validation failed');
        }
    });
    it('deletes user on query_callback event with code "confirm_deletion" ', async () => {
        await User.create({
            telegramId: 1111,
            username: 'test',
            ban: {
                isBanned: false,
            },
            chatId: 2222,
            token: 'abc',
            whitelist: [],
        });

        const deleteUserQueryCallback: StructureOf<TelegramBot.CallbackQuery> = {
            from: {
                id: 1111,
            },
            message: {
                chat: {
                    id: 2222,
                },
                from: {
                    id: 1111,
                },
            },
            id: '123',
            data: JSON.stringify([BotQueryCode.CONFIRM_DELETION]),
        };

        run({ callback_query: deleteUserQueryCallback });

        let user;
        await waitFor(async () => {
            user = await User.findOne({ telegramId: 1111 }).exec();
            return !!user;
        });

        expect(user).toBeTruthy();
    });
});

describe('Aliases', () => {
    let clientConnection: SocketIOClient.Socket;

    // Create a test user in the memory db and establish a socket connection with the server
    beforeAll(async () => {
        const _id = new mongoose.Types.ObjectId();
        const authTokenPayload: AuthTokenPayload = {
            id: _id.toString(),
        };
        const testUserToken = jsonwebtoken.sign(authTokenPayload, JWT_KEY);
        const testUser = new User({
            _id,
            username: 'test_user',
            telegramId: 1234,
            chatId: 5678,
            whitelist: ['test.host'],
            ban: {
                isBanned: false,
            },
            token: testUserToken,
        });

        await testUser.save();

        clientConnection = socketClient.connect(`http://localhost:${process.argv[2]}`, {
            path: '/socket',
            reconnection: false,
            transportOptions: {
                polling: {
                    extraHeaders: {
                        referer: 'https://test.host',
                    },
                },
            },
            // @ts-expect-error socket-io d.ts export missing
            auth: {
                token: testUserToken,
            },
        });

        await new Promise<void>((res, rej) => {
            clientConnection.on('connect', res);
            clientConnection.on('connect_error', rej);
        });
    });

    afterAll(() => clientConnection.close());

    it('creates a new alias on socket message', async () => {
        let alias;

        clientConnection.send('Hi!');

        await waitFor(async () => {
            alias = await Alias.findOne({ socketId: clientConnection.id }).exec();
            return !!alias;
        });

        expect(alias).toBeTruthy();
    });
    it('validates new alias', async () => {
        try {
            await Alias.create({
                socketId: 123,
            });
        } catch (error) {
            expect(error.message).toContain('validation failed');
        }
    });
    it('deletes alias on client disconnection', async () => {
        let alias;

        clientConnection.send('Hi!');

        await waitFor(async () => {
            alias = await Alias.findOne({ socketId: clientConnection.id }).exec();
            return !!alias;
        });

        expect(alias).toBeTruthy();

        clientConnection.close();

        await waitFor(async () => {
            alias = await Alias.findOne({ socketId: clientConnection.id }).exec();
            return !alias;
        });

        expect(alias).toBeFalsy();
    });
});
