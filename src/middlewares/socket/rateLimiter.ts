import { rateLimitConfig } from '../../config';
import { SocketMiddleware } from '../../types';

const rateLimiter: SocketMiddleware = async (socket, next) => {
    try {
        await global.rateLimiter.consume(socket.handshake.address);
        next();
    } catch (_e) {
        next(new Error(rateLimitConfig.message));
    }
};

export default rateLimiter;
