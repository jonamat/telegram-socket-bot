import { EventEmitter } from 'events';
import { SocketMessageEventPayload, CollectorEvent, BotMessageEventPayload, DisconnectEventPayload } from '../types';

class Collector extends EventEmitter {
    constructor(...args) {
        super(...args);
        this.setMaxListeners(100);
    }
    public onSocketMessage(callback: (payload: SocketMessageEventPayload) => void) {
        this.on(CollectorEvent.SOCKET_MESSAGE, callback);
    }

    public onBotMessage(callback: (payload: BotMessageEventPayload) => void) {
        this.on(CollectorEvent.BOT_MESSAGE, callback);
    }

    public emitSocketMessage(payload: SocketMessageEventPayload) {
        this.emit(CollectorEvent.SOCKET_MESSAGE, payload);
    }

    public emitBotMessage(payload: BotMessageEventPayload) {
        this.emit(CollectorEvent.BOT_MESSAGE, payload);
    }

    public closeConnection(payload: DisconnectEventPayload) {
        this.emit(CollectorEvent.DISCONNECT, payload);
    }

    public onDisconnection(callback: (payload: DisconnectEventPayload) => void) {
        this.on(CollectorEvent.DISCONNECT, callback);
    }
}

export default Collector;
