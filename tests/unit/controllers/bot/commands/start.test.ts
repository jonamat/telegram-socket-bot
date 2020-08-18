/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Bot command /start
 * Tests:
 * - Behavior
 * - Data consistency
 * - User experience
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';

import validatePartialSchema from '@Tests/validatePartialSchema';
import { StructureOf } from '@Tests/types';
import { BotCommand, BotResponse, MessageExt } from '@App/types';
import User from '@App/models/User';
import start from '@App/controllers/bot/commands/start';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockUserConstructor = jest.fn();
const mockUserSave = jest.fn();
jest.mock('@App/models/User', () => {
    return class User {
        constructor(newUser) {
            mockUserConstructor(newUser);
        }
        save() {
            mockUserSave();
        }
    };
});

const response: StructureOf<BotResponse> = {
    sendMessage: jest.fn(),
};

const message: StructureOf<MessageExt> = {
    text: `/${BotCommand.START}`,
    chat: {
        id: 1111,
    },
    from: {
        id: 2222,
        username: 'mock_user',
    },
    user: {
        id: 'mock_id',
    },
};

process.env.JWT_KEY = 'any';
process.env.CHATBOX_DOCS_LINK = 'any';

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
    return start(merge<any>(message, messageExt), merge<any>(response, responseExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('creates a new user document if it not exists', async () => {
        await run({ user: undefined });

        expect(mockUserConstructor).toBeCalledTimes(1);
        expect(mockUserSave).toBeCalledTimes(1);
    });
    it('does not create a new document if user already exists', async () => {
        await run();

        expect(mockUserConstructor).toBeCalledTimes(0);
        expect(mockUserSave).toBeCalledTimes(0);
    });
});

describe('Data consistency', () => {
    it('creates a document with valid schema', async () => {
        await run({ user: undefined });

        await validatePartialSchema(
            jest.requireActual<{ default: typeof User }>('@App/models/User').default,
            mockUserConstructor.mock.calls[0][0],
        );

        const { _id, username, telegramId, chatId, whitelist, ban, token } = mockUserConstructor.mock.calls[0][0];
        expect({
            username,
            telegramId,
            chatId,
            whitelist,
            ban,
            token,
        }).toEqual({
            username: message.from?.username,
            telegramId: message.from?.id,
            chatId: message.chat?.id,
            whitelist: ['localhost'],
            ban: { isBanned: false },
            token: JSON.stringify({ id: _id.toString() }),
        });
    });
});

describe('User experience', () => {
    it("warns user if it's already signed up", async () => {
        await run({ user: undefined });

        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it("welcomes user if it's been signed up", async () => {
        await run();

        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('warns user if database throws an error', async () => {
        mockUserSave.mockImplementation(() => {
            throw new Error('Connection lost');
        });

        expect(async () => await run()).not.toThrowError();
        expect(response.sendMessage).toBeCalledTimes(1);
    });
});
