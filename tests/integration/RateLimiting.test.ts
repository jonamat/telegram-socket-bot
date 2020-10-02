/* ------------------------- Integration test suite ------------------------- *
 *
 * Target: Socket request limiter
 * Tests:
 * - Rejection on limit
 *
 * -------------------------------------------------------------------------- */

import path from 'path';
import { Server } from 'http';
import socketClient from 'socket.io-client';
import dotenv from 'dotenv';
import jsonwebtoken from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mocked } from 'ts-jest/utils';

import startMongoMemoryServer from '@Tests/startMongoMemoryServer';
import User from '@App/models/User';
import { AuthTokenPayload, IUser } from '@App/types';
import { initLogDatabase } from '@App/utils/report';
import { rateLimitConfig } from '@App/config';

const { DB_NAME, JWT_KEY } = dotenv.config({
    path: path.resolve(__dirname, '..', '..', 'dev.env'),
}).parsed as NodeJS.ProcessEnv;
const DB_HOST = 'localhost';

let App: { default: Server };
let mongoMemoryServer: MongoMemoryServer;
let testUser: IUser;
let testUserToken: string;

// Use custom ports to avoid conflicts with running instances / tests
process.argv[2] = '3085';
process.env.DB_PORT = '37012';
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
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Client socket requests', () => {
    it('rejects requests over "maxConnections" limit', async () => {
        const defSocketConnectionConfig = {
            path: '/socket',
            reconnection: false,
            transportOptions: {
                polling: {
                    extraHeaders: {
                        referer: 'http://test.host',
                    },
                },
            },
            auth: {
                token: testUserToken,
            },
        };

        let counter = 0;

        while (1) {
            const connection = socketClient.connect(`http://localhost:${process.argv[2]}`, defSocketConnectionConfig);

            try {
                await new Promise((res, rej) => {
                    connection.on('connect', res);
                    connection.on('connect_error', rej);
                });
            } catch (error) {
                expect(error.message).toContain(rateLimitConfig.message);
                break;
            }

            counter++;
            connection.disconnect();
        }

        expect(counter).toBe(rateLimitConfig.maxConnections);
    });
});
