/* ----------------------------- Unit test suite ---------------------------- *
 *
 * Target: Bot message event handler
 * Tests:
 * - Behavior
 *
 * -------------------------------------------------------------------------- */

import merge from 'deepmerge';
import { Socket } from 'socket.io';

import { StructureOf } from '@Tests/types';
import { BotMessageEventPayload } from '@App/types';
import handleBotMessage from '@App/controllers/socket/events/handleBotMessage';

process.setMaxListeners(20);

/* -------------------------------------------------------------------------- */
/*                                    Mocks                                   */
/* -------------------------------------------------------------------------- */

const socket: StructureOf<Socket> = {
    id: 'mock_socketId',
    send: jest.fn(),
};

const payload: StructureOf<BotMessageEventPayload> = {
    message: 'mock_message',
    socketId: 'mock_socketId',
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
 * @param socketExt Override socket properties
 * @param payloadExt Override payload properties
 */
const run = (socketExt: StructureOf<Socket> = {}, payloadExt: StructureOf<BotMessageEventPayload> = {}) => {
    return handleBotMessage(merge<any>(socket, socketExt), merge<any>(payload, payloadExt));
};

/* -------------------------------------------------------------------------- */
/*                                    Tests                                   */
/* -------------------------------------------------------------------------- */

describe('Behavior', () => {
    it('sends message if socket IDs match', () => {
        run({ id: 'anything_else' });
        expect(socket.send).toBeCalledTimes(0);
    });
    it('send nothing if socket IDs do not match', () => {
        run();
        expect(socket.send).toBeCalledTimes(1);
    });
});
