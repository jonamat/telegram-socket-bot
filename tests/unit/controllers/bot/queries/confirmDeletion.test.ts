/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Delete data QueryCallback
 * Tests:
 * - Behavior
 * - Data consistency
 * - User experience
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { Model } from 'mongoose';
import { mocked } from 'ts-jest/utils';

import validatePartialSchema from '@Tests/validatePartialSchema';
import { StructureOf } from '@Tests/types';
import { BotResponse, IUser, MessageExt } from '@App/types';
import confirmDeletion from '@App/controllers/bot/queries/confirmDeletion';
import User from '@App/models/User';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockDelete = jest.fn();
const mockedUser = mocked<Model<IUser> & { exec: jest.Mock }>(User as Model<IUser> & { exec: jest.Mock });
jest.mock('@App/models/User', () => ({
    findOne: jest.fn<any, any>(() => User),
    exec: jest.fn<any, any>(() =>
        Promise.resolve({
            id: 'mock_userId',
            delete: mockDelete,
        }),
    ),
}));

const request: StructureOf<MessageExt> = {
    from: {
        id: 1111,
    },
};

const queryResponse = jest.fn();

const chatResponse: StructureOf<BotResponse> = {
    sendMessage: jest.fn(),
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
 * @param requestExt Override request properties
 * @param chatResponseExt Override response properties (chat)
 */
const run = (requestExt: StructureOf<MessageExt> = {}, chatResponseExt: StructureOf<BotResponse> = {}) => {
    return confirmDeletion(merge<any>(request, requestExt), queryResponse, merge<any>(chatResponse, chatResponseExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('deletes user if requirements are valid', async () => {
        await run();

        expect(mockDelete).toBeCalledTimes(1);
    });
    it('does not delete documents if db throws an error on find', async () => {
        mockedUser.exec.mockImplementationOnce(() => () => Promise.reject('Connection lost'));
        await run();

        expect(mockDelete).toBeCalledTimes(0);
    });
});

describe('Data consistency', () => {
    it('searches the correct document in the database', async () => {
        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/User').default,
            mockedUser.findOne.mock.calls[0][0],
        );
    });
});

describe('User experience', () => {
    it('deletes chat inline keyboard if successful', async () => {
        await run();

        expect(queryResponse.mock.calls[0][0].deleteInlineKeyboard).toBe(true);
    });
    it('warns user if successful', async () => {
        await run();

        expect(chatResponse.sendMessage).toBeCalledTimes(1);
        expect(queryResponse).toBeCalledTimes(1);
    });
    it('warns user if database throws an error with a queryResponse only', async () => {
        mockedUser.exec.mockImplementationOnce(() => Promise.reject('Connection lost'));
        await run();

        expect(chatResponse.sendMessage).toBeCalledTimes(0);
        expect(queryResponse).toBeCalledTimes(1);
    });
    it("warns user if it's not signed up", async () => {
        mockedUser.exec.mockImplementationOnce(() => Promise.resolve(null));
        await run();

        expect(mockDelete).toBeCalledTimes(0);

        expect(chatResponse.sendMessage).toBeCalledTimes(1);
        expect(queryResponse).toBeCalledTimes(1);
    });
    it('deletes inline keyboard if user not exits', async () => {
        mockedUser.exec.mockImplementationOnce(() => Promise.resolve(null));
        await run();

        expect(queryResponse.mock.calls[0][0].deleteInlineKeyboard).toBe(true);
    });
    it('does not delete chat inline keyboard if db throws error', async () => {
        mockedUser.exec.mockImplementationOnce(() => Promise.reject('Connection lost'));
        await run();

        expect(queryResponse.mock.calls[0][0].deleteInlineKeyboard).toBe(undefined);
    });
});
