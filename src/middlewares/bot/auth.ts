import { defaultDBErrorMessage } from '../../config';
import User from '../../models/User';
import { BotCommandMiddleware, BotCommand, IUser } from '../../types';
import report, { Category, IdentifierType, SystemInvolved } from '../../utils/report';

const auth: BotCommandMiddleware = async (msg, _res, next) => {
    let user: IUser | null;

    try {
        user = await User.findOne({ telegramId: msg.from.id }).exec();
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
        // Match all commands except /start
        if (new RegExp(`^\/(?!${BotCommand.START}).*\s*`).test(msg.text)) {
            return next(new Error(`You are not signed up. Type "/${BotCommand.START}" to sign up`));
        }
    } else {
        msg.user = user;
    }

    if (user?.ban.isBanned) {
        report.noteworthy({
            category: Category.BOT,
            systemInvolved: SystemInvolved.AUTH,
            identity: {
                type: IdentifierType.USER_ID,
                identifier: user.id,
            },
            description: 'Banned user rejected',
        });
        return next(
            new Error(
                `You have been banned. Reason: ${user.ban.reason}. To request a reactivation, write to ${process.env.SUPPORT_EMAIL}`,
            ),
        );
    }

    return next();
};

export default auth;
