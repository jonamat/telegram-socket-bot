import dedent from 'dedent-js';
import { BotCommandController, BotQueryCode } from '../../../types';

const deleteData: BotCommandController = (_msg, res) => {
    res.sendMessage(
        dedent(
            `⚠⚠ <b>WARNING</b> ⚠⚠

            This command will delete all your data from the bot database, including:


            🔑 <b>Your access token</b>

            🔗 <b>Your whitelisted hosts</b>

            🆔 <b>Your ID and configuration</b>


            Are you sure to continue?`,
        ),
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Delete data', callback_data: JSON.stringify([BotQueryCode.CONFIRM_DELETION]) },
                        { text: 'Cancel', callback_data: JSON.stringify([BotQueryCode.ABORT]) },
                    ],
                ],
            },

            parse_mode: 'HTML',
        },
    );
};

export default deleteData;
