import jwt from 'jsonwebtoken';
import { defaultDBErrorMessage } from '../../config';
import User from '../../models/User';
import { BotCommand, isAuthTokenPayload, IUser, SocketMiddleware } from '../../types';
import report, { Category, IdentifierType, SystemInvolved } from '../../utils/report';

/** NOTE
 * socket.user is globally declared to be of type IUser, but until the assignment in this module, it must
 * be considered undefined. In the following middlewares and controllers it will be populated.
 */

const auth: SocketMiddleware = async (socket, next) => {
    const { JWT_KEY } = process.env;
    const { token } = socket.handshake.auth as { token?: string; alias?: string };
    let decoded: any;
    let user: IUser | null = null;
    let hostname;

    const makeReport = (description, details?) => ({
        category: Category.SOCKET,
        systemInvolved: SystemInvolved.AUTH,
        identity: {
            type: IdentifierType.SOCKET_ID,
            identifier: socket.id,
        },
        description,
        details,
    });

    if (typeof token === 'undefined') {
        report.info(makeReport('Client tries to connect without token'));
        return next(new Error(`Missing token. See docs at ${process.env.CHATBOX_DOCS_LINK}`));
    }

    try {
        decoded = jwt.verify(token, JWT_KEY);
    } catch (error) {
        report.info(makeReport('Client tries to connect with an invalid token', token));
        return next(new Error(`Invalid token. Type "/${BotCommand.REFRESH_TOKEN}" to request a new one`));
    }

    if (!isAuthTokenPayload(decoded)) {
        report.info(makeReport('Client tries to connect with a corrupted token', JSON.stringify(decoded)));
        return next(
            new Error(`Your token is probably outdated. Type "/${BotCommand.REFRESH_TOKEN}" to request a new one`),
        );
    }

    try {
        user = await User.findById(decoded.id).exec();
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });
        return next(new Error(defaultDBErrorMessage));
    }

    if (!user) {
        return next(new Error(`You are not signed up. See docs at ${process.env.CHATBOX_DOCS_LINK}`));
    }

    if (user.ban.isBanned) {
        report.noteworthy(makeReport('A client attempted to establish a socket connection to a banned user'));
        return next(
            new Error(
                `You have been banned. Reason: ${user.ban.reason}. To request a reactivation, write to ${process.env.SUPPORT_EMAIL}`,
            ),
        );
    }

    try {
        hostname = new URL((socket.handshake.headers as { referer: string }).referer).hostname;
    } catch (error) {
        return next(new Error(`Undefined referer header. Referer must exists`));
    }

    if (!user.whitelist.includes(hostname)) {
        report.info(
            makeReport(
                'A client attempted to establish a connection from a non-whitelisted hostname',
                `Request from: ${hostname}`,
            ),
        );
        return next(new Error(`Invalid hostname. This hostname is not in your whitelist`));
    }

    socket.user = user;

    report.noteworthy({
        category: Category.SOCKET,
        systemInvolved: SystemInvolved.AUTH,
        identity: {
            type: IdentifierType.USER_ID,
            identifier: user.id,
        },
        description: 'Client authenticated successfully',
        details: [`Socket ID assigned: ${socket.id}`, `Telegram ID: ${user.telegramId}`],
    });

    return next();
};

export default auth;
