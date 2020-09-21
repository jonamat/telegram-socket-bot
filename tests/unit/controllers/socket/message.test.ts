/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Socket messages handler
 * Tests:
 * - Data consistency
 * - User experience
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { Socket } from 'socket.io';
import { mocked } from 'ts-jest/utils';

import messageController from '@App/controllers/socket/message';
import getAlias from '@App/utils/getAlias';
import { StructureOf } from '@Tests/types';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

const mockedGetAlias = mocked(getAlias);
jest.mock('@App/utils/getAlias', () => jest.fn(() => Promise.resolve('mock_alias')));

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const socket: StructureOf<Socket> = {
    id: 'mock_socketId',
    user: {
        id: 'mock_userId',
        chatId: 'mock_chatId',
    },
    send: jest.fn(),
};

const message = 'mock_message';

// @ts-expect-error collector is not yet initialized
global.collector = { emitSocketMessage: jest.fn() };

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
    return messageController(merge<any>(socket, socketExt), message);
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Data consistency', () => {
    it('calls getAlias with valid args', async () => {
        await run();

        expect(mockedGetAlias).toBeCalledWith(socket.user?.id, socket.id);
    });
    it('calls the emitter with valid args', async () => {
        await run();

        expect(global.collector.emitSocketMessage).toBeCalledWith({
            alias: 'mock_alias',
            message,
            userId: socket.user?.id,
            chatId: socket.user?.chatId,
        });
    });
});

describe('User experience', () => {
    it('warns user if database throw an error', async () => {
        mockedGetAlias.mockImplementationOnce(() => Promise.reject('Connection lost'));

        await run();

        expect(socket.send).toBeCalledTimes(1);
        expect(global.collector.emitSocketMessage).not.toBeCalled();
    });
});
