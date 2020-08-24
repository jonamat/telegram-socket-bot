import { defaultDBErrorMessage } from '../../../config';
import User from '../../../models/User';
import { BotCommand, BotQueryCallback } from '../../../types';
import report, { Category, SystemInvolved } from '../../../utils/report';

const confirmDeletion: BotQueryCallback = async (req, queryRes, chatRes) => {
    const telegramId = req.from.id;

    try {
        const user = await User.findOne({ telegramId }).exec();

        if (!user) {
            queryRes({ show_alert: false, deleteInlineKeyboard: true });
            return chatRes.sendMessage(`You are not signed up. Type "/${BotCommand.START}" to sign up`);
        }

        await user.delete();

        queryRes({ show_alert: false, deleteInlineKeyboard: true });
        chatRes.sendMessage(`Your data has been deleted. Type /${BotCommand.START} to sign up again`);
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });

        queryRes({ text: defaultDBErrorMessage, show_alert: true });
    }
};

export default confirmDeletion;
