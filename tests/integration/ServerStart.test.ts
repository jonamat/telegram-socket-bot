/* ------------------------- Integration test suite ------------------------- *
 *
 * Target: App entry point
 * Tests:
 * - Runtime environment checks
 * - Initializations of databases connections
 * - Global listeners
 * - Services initializations
 * - Requests routing
 * - Server listening
 *
 * -------------------------------------------------------------------------- */

import http from 'http';
import mongoose from 'mongoose';
import { mocked } from 'ts-jest/utils';

import { initLogDatabase } from '@App/utils/report';
import { BotCommandMiddleware, SocketMiddleware } from '@App/types';
import routeBot from '@App/routes/bot';
import routeSocket from '@App/routes/socket';
import serverFault from '@App/utils/serverFault';

let socketMiddlewares: Array<SocketMiddleware> = [];
let botMiddlewares: Array<BotCommandMiddleware> = [];

process.argv[2] = '3082';
process.setMaxListeners(20);

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

// Ignore server start messages
console.info = () => undefined;
console.error = () => undefined;

const mockedInitLogDatabase = mocked(initLogDatabase);
jest.mock('@App/utils/report', () => require('@Mocks/report'));

jest.mock('@App/models/User', () => undefined);
jest.mock('@App/models/Alias', () => undefined);

const mockedBotRoutes = mocked(routeBot);
jest.mock('@App/routes/bot');

const mockedSocketRoutes = mocked(routeSocket);
jest.mock('@App/routes/socket');

const mockedServerFault = mocked(serverFault);
jest.mock('@App/utils/serverFault', jest.fn);

const mockTelegramBotExtConstructor = jest.fn();
const mockBotUse = jest.fn((...middleware) => (botMiddlewares = botMiddlewares.concat(...middleware)));
jest.mock(
    '@App/utils/TelegramBotExt',
    () =>
        class {
            constructor(token, options) {
                mockTelegramBotExtConstructor(token, options);
            }
            use = mockBotUse;
            onCommand = () => undefined;
            onQuery = () => undefined;
            on = () => undefined;
        },
);

jest.mock('rate-limiter-flexible');

const mockedMongooseConnect = mocked(mongoose.connect);
jest.mock('mongoose', () => ({
    connect: jest.fn(() => Promise.resolve({ connection: { host: 'mock_host', port: 1111, on: () => undefined } })),
}));

const mockSocketServerConstructor = jest.fn();
const mockSocketUse = jest.fn((...middleware) => (socketMiddlewares = socketMiddlewares.concat(...middleware)));
jest.mock('socket.io', () => ({
    Server: class {
        constructor(https, options) {
            mockSocketServerConstructor(https, options);
        }
        use = mockSocketUse;
        on = () => undefined;
    },
}));

const mockedHttp = mocked<{ on: jest.Mock; listen: jest.Mock; createServer: jest.Mock }>(http as any);
jest.mock('http', () => ({
    createServer: jest.fn(() => http),
    on: jest.fn(),
    listen: jest.fn(),
}));

jest.mock('express', () => () => ({
    use: () => undefined,
}));

const mockProcessOn = jest.spyOn(process, 'on');

/* -------------------------------------------------------------------------- */
/*                              Bridge operations                             */
/* -------------------------------------------------------------------------- */
beforeEach(() => {
    jest.clearAllMocks();
    botMiddlewares = [];
    socketMiddlewares = [];
});

/* -------------------------------------------------------------------------- */
/*                              Wrapper function                              */
/* -------------------------------------------------------------------------- */
/**
 * Run the app
 * @param preventExit Keep running the script on process.exit()
 */
const run = async (preventExit = true) => {
    const errors: Array<Error> = [];

    if (preventExit) {
        // @ts-expect-error bypass exit
        process.exit = (code) => {
            errors.push(new Error(`Process exited with code ${code}`));
        };
    }

    try {
        jest.isolateModules(() => {
            require('@App/index');
        });

        // Wait for module promises to be fulfilled
        await Promise.all([mockedMongooseConnect.mock.results[0]?.value, mockedInitLogDatabase.mock.results[0]?.value]);
    } catch (error) {
        errors.push(error);
    }

    if (mockedServerFault.mock.calls.length) errors.push(...mockedServerFault.mock.calls.map((call) => call[0]));

    return errors;
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Environment', () => {
    it('throws an error if a dotenv key is missing', async () => {
        process.env.DB_PWD = '';

        const errors = await run();

        expect(errors.length).toBeTruthy();

        process.env.DB_PWD = 'mock_DB_PWD';
    });
    it('throws an error if an invalid port is passed as argument', async () => {
        process.argv[2] = '-1';

        const errors = await run();

        expect(errors.length).toBeTruthy();

        process.argv[2] = '3080';
    });
    it('does not throw if configuration is valid', async () => {
        const errors = await run();

        expect(errors.length).toBeFalsy();
    });
});

describe('Databases', () => {
    describe('Main database', () => {
        it('is initialized with a valid configuration', async () => {
            await run();

            expect(mockedMongooseConnect).toBeCalledTimes(1);
            expect(mockedMongooseConnect).toBeCalledWith(
                `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?${process.env.DB_URL_QUERY}`,
                {
                    user: process.env.DB_USER,
                    pass: process.env.DB_PWD,
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    connectTimeoutMS: 10000,
                },
            );
        });
        it('throws an error if the connection attempt fails', async () => {
            mockedMongooseConnect.mockImplementationOnce(() => Promise.reject('throw test'));

            const errors = await run();

            expect(errors.length).toBeTruthy();
            expect(mockedMongooseConnect).toBeCalledTimes(1);
        });
    });

    describe('Log database', () => {
        it('is initialized with a valid configuration', async () => {
            await run();

            expect(mockedInitLogDatabase).toBeCalledTimes(1);
            expect(mockedInitLogDatabase).toBeCalledWith();
        });
        it('throws an error if the connection attempt fails', async () => {
            mockedInitLogDatabase.mockImplementationOnce(() => Promise.reject());

            const errors = await run();

            expect(errors.length).toBeTruthy();
            expect(mockedInitLogDatabase).toBeCalledTimes(1);
        });
    });
});

describe('Global listeners', () => {
    it('listens for uncaughtException and unhandledRejection events', async () => {
        await run();

        expect(mockProcessOn).toBeCalledTimes(2);
        expect(mockProcessOn.mock.calls[0][0]).toBe('uncaughtException');
        expect(mockProcessOn.mock.calls[1][0]).toBe('unhandledRejection');
    });
});

describe('HTTP server', () => {
    it('creates an http server instance', async () => {
        await run();

        expect(mockedHttp.createServer).toBeCalledTimes(1);
        expect(mockedHttp.listen).toBeCalledTimes(1);
    });
    it('listen for http server errors', async () => {
        await run();

        expect(mockedHttp.on).toBeCalledTimes(1);
        expect(mockedHttp.on.mock.calls[0][0]).toBe('error');
    });
});

describe('WebSocket server', () => {
    it('creates a WebSocket server instance', async () => {
        await run();

        expect(mockSocketServerConstructor).toBeCalledTimes(1);
    });
});

describe('Telegram API driver', () => {
    it('creates a bot driver instance', async () => {
        await run();

        expect(mockTelegramBotExtConstructor).toBeCalledTimes(1);
    });
});

describe('Middlewares & routing', () => {
    it('registers bot middlewares in the right order', async () => {
        await run();

        expect(mockBotUse).toBeCalledTimes(3);
        expect(botMiddlewares.map((middleware) => middleware.name)).toEqual(['logger', 'rejectUnknownUsers', 'auth']);
    });
    it('register socket middlewares in the right order', async () => {
        await run();

        expect(mockSocketUse).toBeCalledTimes(3);
        expect(socketMiddlewares.map((middleware) => middleware.name)).toEqual(['logger', 'rateLimiter', 'auth']);
    });
    it('routes bot commands', async () => {
        await run();

        expect(mockedBotRoutes).toBeCalledTimes(1);
    });
    it('routes socket events', async () => {
        await run();

        expect(mockedSocketRoutes).toBeCalledTimes(1);
    });
});

describe('Listening', () => {
    it('listens to the provided port by args', async () => {
        process.argv[2] = '20000';

        await run();

        expect(mockedHttp.listen).toBeCalledTimes(1);
        expect(mockedHttp.listen.mock.calls[0][0]).toBe(20000);
    });
    it('listens to the default port if not provided', async () => {
        process.argv[2] = '';

        await run();

        expect(mockedHttp.listen).toBeCalledTimes(1);
        expect(mockedHttp.listen.mock.calls[0][0]).toBe(80);
    });
});
