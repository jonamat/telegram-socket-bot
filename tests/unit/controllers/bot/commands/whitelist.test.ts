/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Bot command /whitelist
 * Tests:
 * - Behavior
 * - Data consistency
 * - User experience
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';

import validatePartialSchema from '@Tests/validatePartialSchema';
import { StructureOf } from '@Tests/types';
import { BotCommand, BotResponse, IUser, MessageExt } from '@App/types';
import User from '@App/models/User';
import whitelist from '@App/controllers/bot/commands/whitelist';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const response: StructureOf<BotResponse> = {
    sendMessage: jest.fn(),
};

const message: StructureOf<MessageExt> & { user: StructureOf<IUser> & { update: jest.Mock } } = {
    text: `/${BotCommand.WHITELIST} host.com`,
    chat: {
        id: 1111,
    },
    from: {
        id: 2222,
        username: 'mock_user',
    },
    user: {
        id: 'mock_id',
        username: 'mock_username',
        telegramId: 'mock_telegramId',
        chatId: 'mock_chatId',
        whitelist: ['mock.host'],
        ban: {
            isBanned: false,
        },
        token: 'mock_token',
        update: jest.fn(() => ({
            exec: () => Promise.resolve(),
        })),
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
    return whitelist(merge<any>(message, messageExt), merge<any>(response, responseExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it("prevents user's document update if hostname is invalid", async () => {
        await run({ text: `/${BotCommand.WHITELIST} invalid_hostname` });

        expect(message.user.update).toBeCalledTimes(0);
    });
    // TODO
    it.skip('updates the user document if hostname is localhost', async () => {
        await run({ text: `/${BotCommand.WHITELIST} localhost` });

        expect(message.user.update).toBeCalledTimes(1);
    });
    it('removes hostname if already in whitelist', async () => {
        await run({ text: `/${BotCommand.WHITELIST} mock.host` });

        expect(message.user.update).toBeCalledTimes(1);

        const { whitelist } = message.user.update.mock.calls[0][0];
        expect(whitelist).toEqual([]);
    });
    it('adds hostname if it not exists in whitelist', async () => {
        await run({ text: `/${BotCommand.WHITELIST} host.com` });

        expect(message.user.update).toBeCalledTimes(1);

        const { whitelist } = message.user.update.mock.calls[0][0];
        expect(whitelist).toEqual(['mock.host', 'host.com']);
    });
});

describe('Data consistency', () => {
    it('update the document with a valid schema', async () => {
        await run();
        await validatePartialSchema(User, message.user.update.mock.calls[0][0]);
    });
});

describe('User experience', () => {
    it('warns user if hostname is invalid', async () => {
        await run({ text: `/${BotCommand.WHITELIST} invalid_hostname` });

        expect(message.user.update).toBeCalledTimes(0);
        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('responds to user if the operation is successful', async () => {
        await run();

        expect(message.user.update).toBeCalledTimes(1);
        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('warns user if database throws an error', async () => {
        message.user.update.mockImplementationOnce(() => ({
            exec: () => Promise.reject('Connection lost'),
        }));

        await run();

        expect(response.sendMessage).toBeCalledTimes(1);
    });
});
