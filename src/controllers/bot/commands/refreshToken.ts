import dedent from 'dedent-js';
import { BotCommandController, BotQueryCode } from '../../../types';

const refreshToken: BotCommandController = (_msg, res) => {
    res.sendMessage(
        dedent(
            `⚠⚠ <b>WARNING</b> ⚠⚠

            This operation will deny your old token access to bot server.
            You'll have to change your old token with the new one to continue using the service.

            Your current whitelist will not be changed.

            Are you sure to continue?`,
        ),
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Refresh token', callback_data: JSON.stringify([BotQueryCode.CONFIRM_REFRESH_TOKEN]) },
                        { text: 'Cancel', callback_data: JSON.stringify([BotQueryCode.ABORT]) },
                    ],
                ],
            },
        },
    );
};

export default refreshToken;
