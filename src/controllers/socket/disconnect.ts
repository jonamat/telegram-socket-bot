import { SocketController } from '../../types';
import report, { Category, IdentifierType } from '../../utils/report';

const disconnect: SocketController = async (socket, reason) => {
    const { id, user } = socket;

    report.info({
        category: Category.SOCKET,
        description: 'Client disconnected',
        identity: {
            type: IdentifierType.USER_ID,
            identifier: user.id,
        },
        details: `Socket disconnected: ${id}`,
    });

    global.collector.closeConnection({ socketId: id, userId: user.id, reason, chatId: user.chatId });
};

export default disconnect;
