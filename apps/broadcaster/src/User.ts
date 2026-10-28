import { WebSocket } from "ws";
import { OutgoingMessage } from "./types/out";
import { SubscriptionManager } from "./SubscriptionManager";
import { IncomingMessage, SUBSCRIBE, UNSUBSCRIBE } from "./types/in";

export class User {
    private id: string;
    private ws: WebSocket;
    private exchangeUserId?: string;

    constructor(id: string, ws: WebSocket, exchangeUserId?: string) {
        this.id = id;
        this.ws = ws;
        this.exchangeUserId = exchangeUserId;
        this.addListeners();
    }

    private subscriptions: string[] = [];

    public getExchangeUserId() {
        return this.exchangeUserId;
    }

    public subscribe(subscription: string) {
        if (!this.subscriptions.includes(subscription)) {
            this.subscriptions.push(subscription);
        }
    }

    public unsubscribe(subscription: string) {
        this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    }

    emit(message: OutgoingMessage) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private addListeners() {
        this.ws.on("message", (message: string) => {
            let parsedMessage: IncomingMessage;
            try {
                parsedMessage = JSON.parse(message);
            } catch (err) {
                console.error("Invalid websocket message", err);
                return;
            }

            if (!Array.isArray(parsedMessage.params)) {
                return;
            }

            if (parsedMessage.method === SUBSCRIBE) {
                parsedMessage.params.forEach(s => {
                    this.subscribe(s);
                    SubscriptionManager.getInstance().subscribe(this.id, s);
                });
            }

            if (parsedMessage.method === UNSUBSCRIBE) {
                parsedMessage.params.forEach(s => {
                    this.unsubscribe(s);
                    SubscriptionManager.getInstance().unsubscribe(this.id, s);
                });
            }
        });
    }

}
