import jwt from 'jsonwebtoken';
import dedent from 'dedent-js';
import User from '../../../models/User';
import { AuthTokenPayload, BotCommand, BotQueryCallback, IUser } from '../../../types';
import report, { Category, SystemInvolved } from '../../../utils/report';
import { defaultDBErrorMessage } from '../../../config';

const confirmRefreshToken: BotQueryCallback = async (req, queryRes, chatRes) => {
    const telegramId = req.from.id;
    const { JWT_KEY } = process.env;
    let user: IUser | null;

    const makeReport = (description, code) => ({
        category: Category.DATABASE,
        systemInvolved: SystemInvolved.CONNECTION,
        description,
        origin: {
            module: __filename,
            code,
        },
    });

    try {
        user = await User.findOne({ telegramId }).exec();
    } catch (error) {
        report.error(makeReport(error, 1));
        return queryRes({ text: defaultDBErrorMessage, show_alert: true });
    }

    if (!user) {
        queryRes({ show_alert: false, deleteInlineKeyboard: true });
        return chatRes.sendMessage(`You are not signed up. Type "/${BotCommand.START}" to sign up`);
    }

    const authTokenPayload: AuthTokenPayload = {
        id: user.id,
    };
    const token = jwt.sign(authTokenPayload, JWT_KEY);

    try {
        await user.update({ token });
    } catch (error) {
        report.error(makeReport(error, 2));
        return queryRes({ text: defaultDBErrorMessage, show_alert: true });
    }

    queryRes({ text: 'Success', show_alert: false, deleteInlineKeyboard: true });

    chatRes.sendMessage(
        dedent(
            `<b>Token renewed</b>

            Your new token is:

            <b>${token}</b>`,
        ),
        { parse_mode: 'HTML' },
    );
};

export default confirmRefreshToken;
