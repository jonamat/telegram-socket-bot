import Alias from '../../../models/Alias';
import { BotResponse, DisconnectEventPayload, IAlias } from '../../../types';
import report, { Category, SystemInvolved } from '../../../utils/report';

type HandleSocketDisconnect = (response: BotResponse, payload: DisconnectEventPayload) => Promise<void>;

const handleSocketDisconnect: HandleSocketDisconnect = async (res, { socketId, userId }) => {
    let aliasDoc: IAlias | null = null;

    try {
        aliasDoc = await Alias.findOne({ socketId, userId }).exec();
    } catch (error) {
        return report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
        });
    }

    // Client has sent no messages in this session yet
    if (!aliasDoc) return;

    res.sendMessage(`<i>User <b>${aliasDoc.alias}</b> has left the chat</i>`, {
        parse_mode: 'HTML',
        disable_notification: true,
    });

    try {
        aliasDoc.delete();
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.CONNECTION,
            description: error,
            origin: {
                module: __filename,
            },
            details: `Cannot delete ${aliasDoc.id} document from alias collection`,
        });
    }
};

export default handleSocketDisconnect;
