import { model, Schema } from 'mongoose';
import { Shape, IUser } from '../types';
import report, { Category, IdentifierType } from '../utils/report';

const { USERS_COLLECTION } = process.env;
const makeReport = (id: number, description: string) => ({
    category: Category.DATABASE,
    identity: {
        type: IdentifierType.TELEGRAM_ID,
        identifier: id.toString(),
    },
    description,
});

const userShape: Shape<IUser> = {
    telegramId: {
        type: Number,
        required: true,
    },
    chatId: {
        type: Number,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
        max: 1024,
    },
    ban: {
        isBanned: Boolean,
        reason: String,
    },
    whitelist: [String],
};

const userSchema = new Schema<IUser>(userShape, { collection: USERS_COLLECTION });

userSchema.pre('save', function (next) {
    report.noteworthy(makeReport(this.toObject().telegramId, 'New user created'));
    next();
});
userSchema.pre('remove', function (next) {
    report.noteworthy(makeReport(this.toObject().telegramId, 'User deleted'));
    next();
});

export default model<IUser>('User', userSchema);
