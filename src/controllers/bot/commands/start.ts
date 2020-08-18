import dedent from 'dedent-js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthTokenPayload, BotCommand, BotCommandController } from '../../../types';
import User from '../../../models/User';
import report, { Category, SystemInvolved } from '../../../utils/report';
import { defaultDBErrorMessage } from '../../../config';

const start: BotCommandController = async ({ from, user, chat }, res) => {
    const { JWT_KEY, CHATBOX_DOCS_LINK } = process.env;

    if (!!user) {
        return res.sendMessage(
            dedent(
                `You are already signed up.
                To know your info, whitelist and token use <b>/${BotCommand.INFO}</b> command.`,
            ),
            {
                parse_mode: 'HTML',
            },
        );
    }

    const _id = new mongoose.Types.ObjectId();
    const authTokenPayload: AuthTokenPayload = {
        id: _id.toString(),
    };

    const token = jwt.sign(authTokenPayload, JWT_KEY);

    user = new User({
        _id,
        username: from.username,
        telegramId: from.id,
        chatId: chat.id,
        whitelist: ['localhost'],
        ban: {
            isBanned: false,
        },
        token,
    });

    try {
        await user.save();
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });

        return res.sendMessage(defaultDBErrorMessage);
    }

    res.sendMessage(
        dedent(
            `<b>Welcome!</b>
            You have been signed up 🎉🎈🎊

            Your token is:

            <b>${token}</b>

            Copy your token in the "token" attribute in your Chatbox component

            Bot commands:
            <b>/${BotCommand.HELP}</b>
            Shows a list of available commands

            <b>/${BotCommand.WHITELIST}</b> [host]
            Allows/disallows a host. To develop on localhost, enter your IP

            <b>/${BotCommand.INFO}</b>
            Displays your info, whitelisted hostnames and your current token

            <b>/${BotCommand.REFRESH_TOKEN}</b>
            Renews your token. The old one will be invalidated

            <b>/${BotCommand.DELETE_DATA}</b>
            Deletes all your information from our server

            <b>/${BotCommand.REPLY}</b> [username] [message]
            Replies to a specific user

            To see React Telegram Chatbox docs and examples, open this link:
            <b>${CHATBOX_DOCS_LINK}</b>`,
        ),
        {
            parse_mode: 'HTML',
        },
    );
};

export default start;
