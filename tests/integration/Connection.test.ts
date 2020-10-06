/* ------------------------- Integration test suite ------------------------- *
 *
 * Target: Client-server WebSocket connection
 * Tests:
 * - Connection setup
 * - Socket events
 *
 * -------------------------------------------------------------------------- */

import path from 'path';
import { Server } from 'http';
import socketClient from 'socket.io-client';
import dotenv from 'dotenv';
import jsonwebtoken from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import deepmerge from 'deepmerge';
import { mocked } from 'ts-jest/utils';

import { StructureOf } from '@Tests/types';
import startMongoMemoryServer from '@Tests/startMongoMemoryServer';
import User from '@App/models/User';
import { AuthTokenPayload, BotMessageEventPayload, IUser, SocketEvent, SocketMessageEventPayload } from '@App/types';
import { initLogDatabase } from '@App/utils/report';

const { DB_NAME, JWT_KEY } = dotenv.config({
    path: path.resolve(__dirname, '..', '..', 'dev.env'),
}).parsed as NodeJS.ProcessEnv;
const DB_HOST = 'localhost';

let App: { default: Server };
let mongoMemoryServer: MongoMemoryServer;
let testUser: IUser;
let testUserToken: string;

// Use custom ports to avoid conflicts with running instances / tests
process.argv[2] = '3080';
process.env.DB_PORT = '37010';
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
mongoose.connect = jest.fn((_uri, opts) => _connect(`mongodb://${DB_HOST}:${process.env.DB_PORT}/${DB_NAME}`, opts));

/* -------------------------------------------------------------------------- */
/*                              Bridge operations                             */
/* -------------------------------------------------------------------------- */

beforeAll(async () => {
    mongoMemoryServer = await startMongoMemoryServer(parseInt(process.env.DB_PORT));

    await mongoose.connect(`mongodb://${DB_HOST}:${process.env.DB_PORT}/${DB_NAME}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const _id = new mongoose.Types.ObjectId();
    const authTokenPayload: AuthTokenPayload = {
        id: _id.toString(),
    };
    testUserToken = jsonwebtoken.sign(authTokenPayload, JWT_KEY);
    testUser = new User({
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
 * Create a socket connection with the server
 * @param connectionOptions Add/override connection options
 */
const run = (connectionOptions: StructureOf<SocketIOClient.ConnectOpts & { auth: { token: number } }>) => {
    const baseConfig = {
        path: '/socket',
        reconnection: false,
        transportOptions: {
            polling: {
                extraHeaders: {
                    referer: 'https://test.host',
                },
            },
        },
    };

    const clientConnection = socketClient.connect(
        `http://localhost:${process.argv[2]}`,
        deepmerge(baseConfig, connectionOptions),
    );

    return clientConnection;
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Connection', () => {
    it('cannot connect if attempting to connect without token', async () => {
        const clientConnection = run({
            auth: {
                token: undefined,
            },
        });

        const error = await new Promise<Error>((res) => {
            clientConnection.on('connect_error', res);
        });

        expect(error).toBeTruthy();
        expect(error.message).toContain('Missing token');
    });
    it('cannot connect if attempting to connect with an invalid token', async () => {
        const clientConnection = run({
            auth: {
                token: 'not_valid_token',
            },
        });

        const error = await new Promise<Error>((res) => {
            clientConnection.on('connect_error', res);
        });

        expect(error).toBeTruthy();
        expect(error.message).toContain('Invalid token');
    });
    it('cannot connect if user is banned', async () => {
        await testUser.updateOne({ ban: { isBanned: true, reason: 'too ugly' } });

        const clientConnection = run({
            auth: {
                token: testUserToken,
            },
        });

        const error = await new Promise<Error>((res) => {
            clientConnection.on('connect_error', res);
        });

        expect(error).toBeTruthy();
        expect(error.message).toContain('You have been banned');

        await testUser.updateOne({ ban: { isBanned: false, reason: '' } });
    });
    it('cannot connect if host is not whitelisted', async () => {
        const clientConnection = run({
            auth: {
                token: testUserToken,
            },
            transportOptions: {
                polling: {
                    extraHeaders: {
                        referer: 'https://not-whitelisted.host',
                    },
                },
            },
        });

        const error = await new Promise<Error>((res) => {
            clientConnection.on('connect_error', res);
        });

        expect(error).toBeTruthy();
        expect(error.message).toContain('Invalid host');
    });
    it('establishes a connection if token is valid', async () => {
        const clientConnection = run({
            auth: {
                token: testUserToken,
            },
        });

        const error = await new Promise<Error | void>((res, rej) => {
            clientConnection.on('connect', res);
            clientConnection.on('connect_error', rej);
        });

        expect(error).toBeFalsy();
    });
});

describe('Client socket events', () => {
    let clientConnection: SocketIOClient.Socket;

    beforeAll(async () => {
        clientConnection = run({
            auth: {
                token: testUserToken,
            },
        });

        await new Promise<void>((res) => {
            clientConnection.on('connect', res);
        });
    });

    it('can send message events', async () => {
        const message = 'Hi!';
        clientConnection.send(message);

        const payload = await new Promise<SocketMessageEventPayload>((res) => {
            global.collector.onSocketMessage(res);
        });

        expect(payload.message).toBe(message);
    });
    it('can receive message events', async () => {
        const message = 'Hi!';

        global.collector.emitBotMessage({
            message,
            socketId: clientConnection.id,
            userId: testUser.id,
        });

        const payload = await new Promise<BotMessageEventPayload>((res) => {
            clientConnection.on(SocketEvent.MESSAGE, res);
        });

        expect(payload).toBe(message);
    });
});
