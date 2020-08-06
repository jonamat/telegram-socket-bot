import { defaultDBErrorMessage } from '../config';
import Alias from '../models/Alias';
import { IAlias } from '../types';
import report, { Category, SystemInvolved } from './report';

const getSocketId = async (userId: string, alias: string): Promise<string | null> => {
    let aliasDoc: IAlias | null = null;

    try {
        aliasDoc = await Alias.findOne({ userId, alias }).exec();
    } catch (error) {
        report.error({
            category: Category.DATABASE,
            systemInvolved: SystemInvolved.COMMUNICATION,
            origin: {
                module: __filename,
            },
            description: error,
        });

        throw new Error(defaultDBErrorMessage);
    }

    return aliasDoc?.socketId || null;
};

export default getSocketId;
