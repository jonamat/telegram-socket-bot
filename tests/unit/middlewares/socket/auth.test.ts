/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Socket authentication middleware
 * Tests:
 * - Behavior
 * - Data consistency
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { mocked } from 'ts-jest/utils';

import { StructureOf } from '@Tests/types';
import auth from '@App/middlewares/socket/auth';
import User from '@App/models/User';
import { IUser } from '@App/types';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockedUser = mocked<Model<IUser> & { exec: jest.Mock }>(User as Model<IUser> & { exec: jest.Mock });
jest.mock('@App/models/User', () => ({
    findById: jest.fn<any, any>(() => User),
    exec: jest.fn<any, any>(() =>
        Promise.resolve({
            id: 'mock_userId',
            ban: {
                isBanned: false,
            },
            whitelist: ['host.com'],
        }),
    ),
}));

const mockNext = jest.fn();

const socket: StructureOf<Socket> = {
    id: 'mock_socketId',
    handshake: {
        auth: {
            token: JSON.stringify({ id: 'mock_userId' }),
            alias: 'mock_alias',
        },
        headers: {
            referer: 'https://host.com/page',
        },
    },
};

process.env.JWT_KEY = 'secret';

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
 * Run the target function with the test configuration
 * @param socketExt Override socket properties
 */
const run = (socketExt: StructureOf<Socket> = {}) => {
    return auth(merge<any>(socket, socketExt), mockNext);
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('calls next fn without error if user exists and is not banned', async () => {
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext).toBeCalledWith();
    });
    it('assign user if exists and is not banned', async () => {
        socket.user = undefined;

        // Use native fn instead of wrapper to preserve obj arg reference
        await auth((socket as unknown) as Socket, mockNext);

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext).toBeCalledWith();

        // @ts-expect-error socket.user should change
        expect(socket.user.id).toEqual('mock_userId');

        delete socket.user;
    });
    it('calls next fn with an error if user is banned', async () => {
        // @ts-expect-error ignore partials
        mockedUser.findById.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() =>
                Promise.resolve({
                    id: 'mock_userId',
                    ban: {
                        isBanned: true,
                        reason: 'any',
                    },
                }),
            ),
        }));
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if db throws one', async () => {
        // @ts-expect-error ignore partials
        mockedUser.findById.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() => Promise.reject()),
        }));
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if a token is not provided by client', async () => {
        await run({ handshake: { auth: { token: undefined } } });

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if a token is invalid (jwt cannot convert it)', async () => {
        await run({ handshake: { auth: { token: 123 } } });

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if a token is malformed (typeguard fail)', async () => {
        await run({ handshake: { auth: { token: JSON.stringify({ notId: 'any' }) } } });

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if user is not signed up', async () => {
        // @ts-expect-error ignore partials partial obj
        mockedUser.findById.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() => Promise.resolve(null)),
        }));
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if client origin is from a non-whitelisted hostname', async () => {
        await run({ handshake: { headers: { referer: 'http://non.whitelisted.host/' } } });

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
});

describe('Data consistency', () => {
    it('searches the correct document in db', async () => {
        await run();

        expect(typeof mockedUser.findById.mock.calls[0][0] === 'string').toBeTruthy();
        expect(mockedUser.findById).toBeCalledWith('mock_userId');
    });
});
