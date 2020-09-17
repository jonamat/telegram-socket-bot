/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Socket "disconnect" event handler
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
import { BotResponse, DisconnectEventPayload, IAlias } from '@App/types';
import Alias from '@App/models/Alias';
import handleSocketDisconnect from '@App/controllers/bot/events/handleSocketDisconnect';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report', () => require('@Mocks/report'));

const mockDelete = jest.fn();
const mockedAlias = mocked<Model<IAlias> & { exec: jest.Mock }>(Alias as Model<IAlias> & { exec: jest.Mock });
jest.mock('@App/models/Alias', () => ({
    findOne: jest.fn<any, any>(() => Alias),
    exec: jest.fn<any, any>(() =>
        Promise.resolve({
            id: 'mock_aliasId',
            alias: 'mock_alias',
            delete: mockDelete,
        }),
    ),
}));

const response: StructureOf<BotResponse> = {
    sendMessage: jest.fn(),
};

const payload: StructureOf<DisconnectEventPayload> = {
    socketId: 'mock:_socketId',
    userId: 'mock_userId',
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
 * @param responseExt Override response properties
 * @param payloadExt Override payload properties
 */
const run = (responseExt: StructureOf<BotResponse> = {}, payloadExt: StructureOf<DisconnectEventPayload> = {}) => {
    return handleSocketDisconnect(merge<any>(response, responseExt), merge<any>(payload, payloadExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('deletes alias document if exists', async () => {
        await run();

        expect(mockDelete).toBeCalledTimes(1);
    });
});

describe('Data consistency', () => {
    it('searches the correct document in the database', async () => {
        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/Alias').default,
            mockedAlias.findOne.mock.calls[0][0],
        );

        expect(mockedAlias.findOne).toBeCalledTimes(1);
        expect(mockedAlias.findOne).toBeCalledWith({
            socketId: payload.socketId,
            userId: payload.userId,
        });
    });
});

describe('User experience', () => {
    it('does NOT warn user if client has connected but does not leave messages', async () => {
        // @ts-expect-error ignore partials
        mockedAlias.findOne.mockImplementationOnce(() => ({
            exec: () => Promise.resolve(null),
        }));
        await run();

        expect(response.sendMessage).not.toBeCalled();
    });
    it('warns user if client has left the chat', async () => {
        await run();

        expect(response.sendMessage).toBeCalledTimes(1);
    });
    it('does NOT warn user if database throws an error', async () => {
        // @ts-expect-error ignore partials
        mockedAlias.findOne.mockImplementationOnce(() => ({
            exec: () => Promise.reject(),
        }));

        await run();

        expect(response.sendMessage).not.toBeCalled();
    });
});
