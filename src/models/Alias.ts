import { model, Schema } from 'mongoose';
import { IAlias, Shape } from '../types';
import report, { Category, IdentifierType } from '../utils/report';

const { ALIASES_COLLECTION } = process.env;
const makeReport = (document: IAlias, description: string) => ({
    category: Category.DATABASE,
    identity: {
        type: IdentifierType.SOCKET_ID,
        identifier: document.toObject().socketId,
    },
    description,
});

const aliasShape: Shape<IAlias> = {
    userId: {
        type: String,
        required: true,
    },
    socketId: {
        type: String,
        required: true,
    },
    alias: {
        type: String,
        required: true,
    },
};

const aliasSchema = new Schema<IAlias>(aliasShape, { collection: ALIASES_COLLECTION });

aliasSchema.pre('save', function (next) {
    report.info(makeReport(this, 'New alias created'));
    next();
});
aliasSchema.pre('remove', function (next) {
    report.info(makeReport(this, 'Alias deleted'));
    next();
});

export default model<IAlias>('Alias', aliasSchema);
