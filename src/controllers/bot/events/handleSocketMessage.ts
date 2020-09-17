import { BotResponse, SocketMessageEventPayload } from '../../../types';

type HandleSocketMessage = (response: BotResponse, payload: SocketMessageEventPayload) => void;

const handleSocketMessage: HandleSocketMessage = (res, { message, alias }) => {
    res.sendMessage(`<b>${alias}</b>: ${message}`, { parse_mode: 'HTML' });
};

export default handleSocketMessage;
