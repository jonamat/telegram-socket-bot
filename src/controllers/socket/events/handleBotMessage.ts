import { Socket } from 'socket.io';
import { BotMessageEventPayload } from '../../../types';

type HandleBotMessage = (socket: Socket, payload: BotMessageEventPayload) => void;

const handleBotMessage: HandleBotMessage = (socket, { message, socketId }) => {
    if (socket.id !== socketId) return;
    socket.send(message);
};

export default handleBotMessage;
