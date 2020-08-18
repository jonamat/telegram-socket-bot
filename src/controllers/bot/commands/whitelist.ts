import dedent from 'dedent-js';
import { defaultDBErrorMessage } from '../../../config';
import { BotCommand, BotCommandController } from '../../../types';
import report, { Category, SystemInvolved } from '../../../utils/report';

const whitelist: BotCommandController = async ({ user, text }, res) => {
    const parsed = text.replace(new RegExp(`^\/${BotCommand.WHITELIST}\\s*`), '').split(' ');

    if (parsed === null || !parsed.length || parsed.length > 1 || parsed[0] === '') {
        return res.sendMessage(
            dedent(
                `I cannot handle your request.

                Usage:
                <b>/${BotCommand.WHITELIST} [hostname]</b>`,
            ),
            { parse_mode: 'HTML' },
        );
    }

    const hostname = parsed[0];

    if (hostname !== 'localhost' && !hostname.includes('.')) {
        return res.sendMessage(`The provided hostname "${hostname}" is invalid`);
    }

    try {
        if (user.whitelist.includes(hostname)) {
            await user.update({ whitelist: user.whitelist.filter((value) => value !== hostname) }).exec();

            res.sendMessage(`Hostname "${hostname}" removed from the whitelist`);
        } else {
            await user.update({ whitelist: user.whitelist.concat(hostname) }).exec();

            res.sendMessage(`Hostname "${hostname}" added to the whitelist`);
        }
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });
        res.sendMessage(defaultDBErrorMessage);
    }
};

export default whitelist;
