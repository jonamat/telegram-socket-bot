import { BotCommandMiddleware } from '../../types';
import report, { Category, IdentifierType, SystemInvolved } from '../../utils/report';

const logger: BotCommandMiddleware = (msg, _res, next) => {
    report.info({
        category: Category.BOT,
        systemInvolved: SystemInvolved.COMMUNICATION,
        identity: {
            type: IdentifierType.TELEGRAM_ID,
            identifier: msg.from?.id,
        },
        description: 'New incoming bot command',
        details: `Command: ${msg.text}`,
    });

    return next();
};

export default logger;
