/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: getAlias function
 * Tests:
 * - Behavior
 * - Data consistency
 *
 * -------------------------------------------------------------------------- */

import { mocked } from 'ts-jest/utils';

import validatePartialSchema from '@Tests/validatePartialSchema';
import Alias from '@App/models/Alias';
import getAlias from '@App/utils/getAlias';

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
            alias: 'mock_alias',
        }),
    ),
}));

/* -------------------------------------------------------------------------- */
/*                              Bridge operations                             */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
    jest.clearAllMocks();
    mockedAlias.exec.mockImplementation(() =>
        Promise.resolve({
            alias: 'mock_alias',
        }),
    );
});

/* -------------------------------------------------------------------------- */
/*                              Wrapper function                              */
/* -------------------------------------------------------------------------- */

/**
 * Run the target function with the test configuration
 * @param userId Override user id arg
 * @param socketId Override socket id arg
 */
const run = (userId = 'mock_userId', socketId = 'mock_socketId') => {
    return getAlias(userId, socketId);
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('returns a string alias if it was found in the db', async () => {
        const alias = await run();

        expect(alias).toBe('mock_alias');
    });
    it('returns a generated string alias if not present in db', async () => {
        mockedAlias.exec.mockImplementation(() => Promise.resolve(null));

        const alias = await run();

        expect(mockedAlias.exec).toBeCalledTimes(2);
        expect(alias).not.toBe('mock_alias');
        expect(parseInt(alias)).toBeTruthy();
    });
    it('upload a new alias document if it was been generated locally', async () => {
        mockedAlias.exec.mockImplementation(() => Promise.resolve(null));

        const alias = await run();

        expect(alias).not.toBe('mock_alias');
        expect(mockedAlias.create).toBeCalledTimes(1);
    });
    it('throws an exception on db error', async () => {
        mockedAlias.exec.mockImplementationOnce(() => Promise.reject());

        await run().catch((error) => expect(error).toBeTruthy());
    });
});

describe('Data consistency', () => {
    it('searches for existent socketIds with valid properties', async () => {
        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/Alias').default,
            mockedAlias.findOne.mock.calls[0][0],
        );

        expect(mockedAlias.findOne).toBeCalledTimes(1);
        expect(mockedAlias.findOne).toBeCalledWith({ userId: 'mock_userId', socketId: 'mock_socketId' });
    });
    it('searches for existent alias with valid properties', async () => {
        mockedAlias.exec.mockImplementation(() => Promise.resolve(null));

        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/Alias').default,
            mockedAlias.findOne.mock.calls[1][0],
        );

        expect(mockedAlias.findOne).toBeCalledTimes(2);
    });
    it('create a new valid alias document', async () => {
        mockedAlias.exec.mockImplementation(() => Promise.resolve(null));

        await run();
        await validatePartialSchema(
            jest.requireActual('@App/models/Alias').default,
            mockedAlias.create.mock.calls[0][0],
        );

        expect(mockedAlias.create).toBeCalledTimes(1);
    });
});
