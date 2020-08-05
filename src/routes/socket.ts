import { Server, Socket } from 'socket.io';
import { SocketEvent } from '../types';

// Controllers
import message from '../controllers/socket/message';
import disconnect from '../controllers/socket/disconnect';

// Collector event handlers
import handleBotMessage from '../controllers/socket/events/handleBotMessage';

const routeSocket = (webSocketServer: Server) => {
    webSocketServer.on('connection', async (socket: Socket) => {
        socket.on(SocketEvent.MESSAGE, (payload) => message(socket, payload));
        socket.on(SocketEvent.DISCONNECT, (payload) => disconnect(socket, payload));

        // Listen for incoming events from bot
        global.collector.onBotMessage((payload) => handleBotMessage(socket, payload));
    });
};

export default routeSocket;
