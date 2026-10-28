import type { Ticker } from "./types";

function getBaseUrl() {
    if (typeof window === "undefined") {
        return "ws://localhost:3001";
    }
    return `ws://${window.location.hostname}:3001`;
}

type Callback = (data: any) => void;

type CallbackEntry = {
    callback: Callback;
    id: string;
};

export class SignalingManager {
    private ws: WebSocket | null = null;
    private static instance: SignalingManager;
    private bufferedMessages: any[] = [];
    private callbacks: Record<string, CallbackEntry[]> = {};
    private subscriptions: Set<string> = new Set();
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private reconnectAttempts: number = 0;
    private id: number = 1;
    private initialized: boolean = false;

    private constructor() {
        this.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SignalingManager();
        }
        return this.instance;
    }

    private connect() {
        this.ws = new WebSocket(getBaseUrl());

        this.ws.onopen = () => {
            this.initialized = true;
            this.reconnectAttempts = 0;

            this.subscriptions.forEach(subscription => {
                this.ws?.send(JSON.stringify({
                    method: "SUBSCRIBE",
                    params: [subscription],
                    id: this.id++
                }));
            });

            this.bufferedMessages.forEach(message => {
                this.ws?.send(JSON.stringify(message));
            });
            this.bufferedMessages = [];
        };

        this.ws.onmessage = (event) => {
            let message: any;
            try {
                message = JSON.parse(event.data);
            } catch {
                return;
            }

            const data = message?.data;
            if (!data?.e) {
                return;
            }

            const type = data.e as string;
            const entries = this.callbacks[type];
            if (!entries) {
                return;
            }

            const stream = typeof message.stream === "string" ? message.stream : undefined;
            entries.forEach(({ callback, id }) => {
                if (id && stream && id !== stream) {
                    return;
                }

                try {
                    if (type === "ticker") {
                        const newTicker: Partial<Ticker> = {
                            firstPrice: data.fp,
                            high: data.h,
                            lastPrice: data.c,
                            low: data.l,
                            priceChange: data.pc,
                            priceChangePercent: data.pcp,
                            quoteVolume: data.V,
                            symbol: data.s,
                            trades: data.n !== undefined ? String(data.n) : undefined,
                            volume: data.v,
                        };
                        callback(newTicker);
                    } else if (type === "depth") {
                        callback({
                            bids: data.b ?? [],
                            asks: data.a ?? [],
                        });
                    } else if (type === "trade") {
                        callback({
                            id: Number(data.t),
                            isBuyerMaker: Boolean(data.m),
                            price: data.p,
                            quantity: data.q,
                            quoteQuantity: (Number(data.p) * Number(data.q)).toString(),
                            timestamp: Date.now(),
                        });
                    } else if (type === "fill") {
                        callback({
                            id: Number(data.t),
                            isBuyerMaker: Boolean(data.m),
                            market: data.s,
                            price: data.p,
                            quantity: data.q,
                            side: data.side,
                            orderId: data.o,
                            timestamp: Date.now(),
                        });
                    }
                } catch (err) {
                    console.error("Signaling callback failed", err);
                }
            });
        };

        this.ws.onclose = () => {
            this.initialized = false;
            this.ws = null;
            this.scheduleReconnect();
        };

        this.ws.onerror = () => {
            this.ws?.close();
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
        }, delay);
    }

    sendMessage(message: any) {
        if (message.method === "SUBSCRIBE" || message.method === "UNSUBSCRIBE") {
            const subscriptions: string[] = Array.isArray(message.params) ? message.params : [];
            subscriptions.forEach(subscription => {
                if (message.method === "SUBSCRIBE") {
                    if (this.subscriptions.has(subscription)) {
                        return;
                    }
                    this.subscriptions.add(subscription);
                } else {
                    this.subscriptions.delete(subscription);
                }

                if (this.initialized && this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        method: message.method,
                        params: [subscription],
                        id: this.id++
                    }));
                }
            });
            return;
        }

        const messageToSend = {
            ...message,
            id: this.id++
        };
        if (!this.initialized || this.ws?.readyState !== WebSocket.OPEN) {
            this.bufferedMessages.push(messageToSend);
            return;
        }
        this.ws.send(JSON.stringify(messageToSend));
    }

    async registerCallback(type: string, callback: Callback, id: string) {
        this.callbacks[type] = this.callbacks[type] || [];
        this.callbacks[type].push({ callback, id });
    }

    async deRegisterCallback(type: string, id: string) {
        if (this.callbacks[type]) {
            const index = this.callbacks[type].findIndex((callback) => callback.id === id);
            if (index !== -1) {
                this.callbacks[type].splice(index, 1);
            }
        }
    }
}
