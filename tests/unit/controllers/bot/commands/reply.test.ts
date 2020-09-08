/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Bot command /r (reply)
 * Tests:
 * - Behavior
 * - Data consistency
 * - User experience
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { mocked } from 'ts-jest/utils';

import { StructureOf } from '@Tests/types';
import { BotCommand, BotResponse, MessageExt } from '@App/types';
import getSocketId from '@App/utils/getSocketId';
import reply from '@App/controllers/bot/commands/reply';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

const mockedGetSockedId = mocked(getSocketId);
jest.mock('@App/utils/getSocketId', () => jest.fn(() => Promise.resolve('mock_socketId')));
jest.mock('@App/utils/report', () => require('@Mocks/report'));

// @ts-expect-error collector is not yet initialized
global.collector = { emitBotMessage: jest.fn() };

const response: StructureOf<BotResponse> = {
    sendMessage: jest.fn(),
};

const message: StructureOf<MessageExt> = {
    text: `/${BotCommand.REPLY} username This is the message`,
    user: {
        id: 'mock_id',
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
 * Run the target function with the test configuration
 * @param messageExt Override message properties
 * @param responseExt Override response properties
 */
const run = (messageExt: StructureOf<MessageExt> = {}, responseExt: StructureOf<BotResponse> = {}) => {
    return reply(merge<any>(message, messageExt), merge<any>(response, responseExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('prevents calls to the emitter if the command is malformed', async () => {
        await run({ text: `/${BotCommand.REPLY}username This is the message` });

        expect(global.collector.emitBotMessage).toBeCalledTimes(0);
    });
    it('prevents calls to the emitter if there are no alias in db', async () => {
        mockedGetSockedId.mockImplementationOnce(() => Promise.resolve(null));

        await run();

        expect(global.collector.emitBotMessage).toBeCalledTimes(0);
    });
    it('prevents calls to the emitter on database error', async () => {
        mockedGetSockedId.mockImplementationOnce(() => Promise.reject('Connection lost'));

        await run();

        expect(global.collector.emitBotMessage).toBeCalledTimes(0);
    });
    it('does not throw exceptions on database error', async () => {
        mockedGetSockedId.mockImplementationOnce(() => Promise.reject('Connection lost'));

        expect(async () => await run()).not.toThrowError();
    });
    it('calls the emitter if command is valid', async () => {
        await run();

        expect(global.collector.emitBotMessage).toBeCalledTimes(1);
    });
});

describe('Data consistency', () => {
    it('calls getSocketId with valid args', async () => {
        await run();

        expect(getSocketId).toBeCalledWith(message.user?.id, 'username');
    });
    it('calls collector with valid args', async () => {
        await run();

        expect(global.collector.emitBotMessage).toBeCalledWith({
            userId: message.user?.id,
            message: 'This is the message',
            socketId: 'mock_socketId',
        });
    });
});

describe('User experience', () => {
    it('warns user on database error', async () => {
        mockedGetSockedId.mockImplementationOnce(() => Promise.reject('Connection lost'));

        await run();

        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('warns user if alias has no matches', async () => {
        mockedGetSockedId.mockImplementationOnce(() => Promise.resolve(null));

        await run();

        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('does not responds to user if the command is valid', async () => {
        await run();

        expect(response.sendMessage).toBeCalledTimes(0);
    });
});
