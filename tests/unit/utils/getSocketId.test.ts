/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: getSocketId function
 * Tests:
 * - Behavior
 * - Data consistency
 *
 * -------------------------------------------------------------------------- */

import { mocked } from 'ts-jest/utils';

import validatePartialSchema from '@Tests/validatePartialSchema';
import Alias from '@App/models/Alias';
import getSocketId from '@App/utils/getSocketId';

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

jest.mock('@App/utils/report');

const mockedAlias = mocked<any>(Alias);
jest.mock('@App/models/Alias', () => ({
    findOne: jest.fn<any, any>(() => Alias),
    create: jest.fn(),
    exec: jest.fn<any, any>(() =>
        Promise.resolve({
            socketId: 'mock_socketId',
        }),
    ),
}));

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
 * @param userId Override user id arg
 * @param alias Override alias arg
 */
const run = (userId = 'mock_userId', alias = 'mock_alias') => {
    return getSocketId(userId, alias);
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('returns a string socketId if it was found in the db', async () => {
        const socketId = await run();

        expect(socketId).toBe('mock_socketId');
    });
    it('returns null if there are no socketId fot the supplied alias in db', async () => {
        mockedAlias.exec.mockImplementationOnce(() => Promise.resolve(null));
        const socketId = await run();

        expect(socketId).toBe(null);
    });
    it('throws an unhandled exception on db error', async () => {
        mockedAlias.exec.mockImplementationOnce(() => Promise.reject());

        await run().catch((error) => expect(error).toBeTruthy());
    });
});

describe('Data consistency', () => {
    it('searches for existent socketId with valid properties', async () => {
        mockedAlias.exec.mockImplementationOnce(() => Promise.resolve(null));

        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/Alias').default,
            mockedAlias.findOne.mock.calls[0][0],
        );

        expect(mockedAlias.findOne).toBeCalledTimes(1);
    });
});
