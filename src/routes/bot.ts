import { BotCommand, BotQueryCode } from '../types';
import TelegramBotExt from '../utils/TelegramBotExt';

// Command controllers
import start from '../controllers/bot/commands/start';
import deleteData from '../controllers/bot/commands/deleteData';
import whitelist from '../controllers/bot/commands/whitelist';
import status from '../controllers/bot/commands/status';
import refreshToken from '../controllers/bot/commands/refreshToken';
import help from '../controllers/bot/commands/help';
import reply from '../controllers/bot/commands/reply';

// Query callbacks
import confirmDeletion from '../controllers/bot/queries/confirmDeletion';
import abortKeyboardAction from '../controllers/bot/queries/abortKeyboardAction';
import confirmRefreshToken from '../controllers/bot/queries/confirmRefreshToken';

// Collector event handlers
import handleSocketMessageEvent from '../controllers/bot/events/handleSocketMessage';
import handleSocketDisconnect from '../controllers/bot/events/handleSocketDisconnect';

const routeBot = (bot: TelegramBotExt) => {
    bot.onCommand(BotCommand.START, start, { exact: true });
    bot.onCommand(BotCommand.HELP, help, { exact: true });
    bot.onCommand(BotCommand.DELETE_DATA, deleteData, { exact: true });
    bot.onCommand(BotCommand.INFO, status, { exact: true });
    bot.onCommand(BotCommand.WHITELIST, whitelist);
    bot.onCommand(BotCommand.REFRESH_TOKEN, refreshToken, { exact: true });
    bot.onCommand(BotCommand.REPLY, reply);

    bot.onQuery(BotQueryCode.CONFIRM_DELETION, confirmDeletion);
    bot.onQuery(BotQueryCode.CONFIRM_REFRESH_TOKEN, confirmRefreshToken);
    bot.onQuery(BotQueryCode.ABORT, abortKeyboardAction);

    // Listen for incoming events from sockets
    global.collector.onSocketMessage((payload) => handleSocketMessageEvent(bot.response(payload.chatId), payload));
    global.collector.onDisconnection((payload) => handleSocketDisconnect(bot.response(payload.chatId), payload));
};

export default routeBot;
