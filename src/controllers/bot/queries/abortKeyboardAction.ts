import { BotQueryCallback } from '../../../types';

const abortKeyboardAction: BotQueryCallback = (req, queryRes, chatRes) => {
    queryRes({ show_alert: false, deleteInlineKeyboard: true });
    chatRes.sendMessage('Ok');
};

export default abortKeyboardAction;
