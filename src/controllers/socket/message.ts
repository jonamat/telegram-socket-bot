import { defaultDBErrorMessage } from '../../config';
import { SocketController, SocketMessageEventPayload } from '../../types';
import getAlias from '../../utils/getAlias';
import report, { Category, SystemInvolved } from '../../utils/report';

const message: SocketController = async (socket, message) => {
    let alias: string;

    try {
        alias = await getAlias(socket.user.id, socket.id);
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });

        return socket.send(defaultDBErrorMessage);
    }

    const payload: SocketMessageEventPayload = {
        alias,
        message: message,
        userId: socket.user.id,
        chatId: socket.user.chatId,
    };

    global.collector.emitSocketMessage(payload);
};

export default message;
