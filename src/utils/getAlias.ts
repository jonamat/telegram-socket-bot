import { defaultDBErrorMessage } from '../config';
import Alias from '../models/Alias';
import report, { Category, SystemInvolved } from './report';

const generateAlias = (): string => {
    return Math.floor(Math.random() * 100).toString();
};

const getAlias = async (userId: string, socketId: string): Promise<string> => {
    try {
        const aliasDoc = await Alias.findOne({ userId, socketId }).exec();
        let alias = aliasDoc?.alias;

        if (!alias) {
            do {
                alias = generateAlias();
            } while (await Alias.findOne({ userId, alias }).exec());

            await Alias.create({ alias, socketId, userId });
        }

        return alias;
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
};

export default getAlias;
