import dedent from 'dedent-js';
import { defaultDBErrorMessage } from '../../../config';
import { BotCommand, BotCommandController, BotMessageEventPayload } from '../../../types';
import getSocketId from '../../../utils/getSocketId';
import report, { Category, SystemInvolved } from '../../../utils/report';

const reply: BotCommandController = async (msg, res) => {
    const parsed = RegExp(`^\\/${BotCommand.REPLY}\\s{1,}(\\S*)\\s*(.*$)`, 'gi').exec(msg.text);
    let socketId: string | null = null;

    if (!parsed || !parsed[1] || !parsed[2]) {
        return res.sendMessage(
            dedent(
                `I cannot understand your request.

                Usage:
                /${BotCommand.REPLY} [username] [message]`,
            ),
        );
    }

    const [, alias, message] = parsed;
    try {
        socketId = await getSocketId(msg.user.id, alias);
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

    if (!socketId) {
        return res.sendMessage(`User "${alias}" has leaved the chat or does not exist`);
    }

    const payload: BotMessageEventPayload = {
        userId: msg.user.id,
        message,
        socketId,
    };

    global.collector.emitBotMessage(payload);
};

export default reply;
