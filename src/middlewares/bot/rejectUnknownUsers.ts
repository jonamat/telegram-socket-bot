import { BotCommandMiddleware } from '../../types';
import report, { Category, SystemInvolved } from '../../utils/report';

const rejectUnknownUsers: BotCommandMiddleware = (msg, _res, next) => {
    if (typeof msg.from === 'undefined') {
        report.info({
            category: Category.BOT,
            systemInvolved: SystemInvolved.AUTH,
            description: 'User rejected for lack of identification',
        });

        return next(new Error('I cannot identify you. Open the chat with a valid user'));
    }

    return next();
};

export default rejectUnknownUsers;
