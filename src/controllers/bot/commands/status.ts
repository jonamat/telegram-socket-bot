import dedent from 'dedent-js';
import { BotCommandController } from '../../../types';

const status: BotCommandController = ({ user }, res) => {
    res.sendMessage(
        dedent(
            `<b>Bot status and info</b>

            🏷 <b>Personal ID</b>
            ${user.id}

            🔑 <b>Token</b>
            ${user.token}

            ✅ <b>Whitelist</b>
            ${user.whitelist.length ? user.whitelist.map((host) => host).join('\n') : 'No hosts allowed'}`,
        ),
        {
            parse_mode: 'HTML',
        },
    );
};

export default status;
