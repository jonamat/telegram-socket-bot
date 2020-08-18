import dedent from 'dedent-js';
import { BotCommand, BotCommandController } from '../../../types';

const help: BotCommandController = (_msg, res) => {
    res.sendMessage(
        dedent(
            `<b>List of available bot commands</b>

            <b>/${BotCommand.WHITELIST} [host]</b>
            Allows/disallows a host. To develop on localhost, enter your IP

            <b>/${BotCommand.INFO}</b>
            Displays your info, whitelisted hosts and your current token

            <b>/${BotCommand.REFRESH_TOKEN}</b>
            Renews your token. The old one will be invalidated

            <b>/${BotCommand.DELETE_DATA}</b>
            Deletes all your information from server

            <b>/${BotCommand.REPLY} [username] [message]</b>
            Replies to a specific user

            To see React Telegram Chatbox docs and examples, open this link:
            <b>${process.env.CHATBOX_DOCS_LINK}</b>`,
        ),
        {
            parse_mode: 'HTML',
        },
    );
};

export default help;
