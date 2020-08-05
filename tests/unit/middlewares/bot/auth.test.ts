/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Bot authentication middleware
 * Tests:
 * - Behavior
 * - Data consistency
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { mocked } from 'ts-jest/utils';

import { StructureOf } from '@Tests/types';
import validatePartialSchema from '@Tests/validatePartialSchema';
import auth from '@App/middlewares/bot/auth';
import User from '@App/models/User';
import { BotCommand, BotResponse, MessageExt } from '@App/types';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockedUser = mocked(User);
jest.mock('@App/models/User', () => ({
    findOne: jest.fn<any, any>(() => User),
    exec: jest.fn<any, any>(() =>
        Promise.resolve({
            id: 'mock_userId',
            ban: {
                isBanned: false,
            },
        }),
    ),
}));

const mockNext = jest.fn();

const message: StructureOf<MessageExt> = {
    text: `/${BotCommand.START}`,
    from: {
        id: 2222,
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
 * @param response Override response properties
 */
const run = (messageExt: StructureOf<MessageExt> = {}, response: StructureOf<BotResponse> = {}) => {
    return auth(merge<any>(message, messageExt), response as BotResponse, mockNext);
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
    it('assigns user property if it exists and is not banned', async () => {
        message.user = undefined;

        // Use native fn instead of wrapper to preserve obj arg reference
        await auth((message as unknown) as MessageExt, {} as BotResponse, mockNext);

        expect(message.user).toBeTruthy();

        delete message.user;
    });
    it('calls next fn with error if user is banned', async () => {
        // @ts-expect-error ignore partials partial obj
        mockedUser.findOne.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() =>
                Promise.resolve({
                    id: 'mock_userId',
                    ban: {
                        isBanned: true,
                        reason: '',
                    },
                }),
            ),
        }));
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it('calls next fn with an error if db throws one', async () => {
        // @ts-expect-error ignore partials partial obj
        mockedUser.findOne.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() => Promise.reject()),
        }));
        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();
    });
    it(`calls next fn with an error if unsigned user is trying to use a command that is not /${BotCommand.START}`, async () => {
        // @ts-expect-error ignore partials partial obj
        mockedUser.findOne.mockImplementationOnce(() => ({
            exec: jest.fn<any, any>(() => Promise.resolve(null)),
        }));
        message.text = '/any';

        await run();

        expect(mockNext).toBeCalledTimes(1);
        expect(mockNext.mock.calls[0][0] instanceof Error).toBeTruthy();

        message.text = `/${BotCommand.START}`;
    });
});

describe('Data consistency', () => {
    it('searches the correct document in db', async () => {
        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/User').default,
            mockedUser.findOne.mock.calls[0][0],
        );

        expect(mockedUser.findOne).toBeCalledTimes(1);
        expect(mockedUser.findOne).toBeCalledWith({ telegramId: message.from?.id });
    });
});
