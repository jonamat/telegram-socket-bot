class TelegramBot extends jest.requireActual('node-telegram-bot-api') {
    answerCallbackQuery = () => Promise.resolve();
    deleteMessage = () => Promise.resolve();
    editMessageReplyMarkup = () => Promise.resolve();
    sendMessage = () => Promise.resolve();
    sendPhoto = () => Promise.resolve();
    sendVideo = () => Promise.resolve();
}

export default TelegramBot;
