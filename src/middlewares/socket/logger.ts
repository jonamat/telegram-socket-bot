import { SocketMiddleware } from '../../types';
import report, { Category, IdentifierType, SystemInvolved } from '../../utils/report';

const logger: SocketMiddleware = (socket, next) => {
    report.info({
        category: Category.SOCKET,
        systemInvolved: SystemInvolved.COMMUNICATION,
        description: 'New socket connection request',
        identity: {
            type: IdentifierType.SOCKET_ID,
            identifier: socket.id,
        },
        details: `Client address: ${socket.handshake.address}`,
    });

    next();
};

export default logger;
