import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";
import type { OutgoingMessage } from "./types/out";

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private redisClient: RedisClientType;
    private connection: Promise<unknown>;

    private constructor() {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        this.redisClient = createClient({ url: redisUrl });
        this.redisClient.on("error", (err) => {
            console.error("Subscription Redis client error", err);
        });
        this.connection = this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public static userChannel(userId: string) {
        return `user@${userId}`;
    }

    public subscribe(userId: string, subscription: string) {
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            return
        }

        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));
        this.reverseSubscriptions.set(subscription, (this.reverseSubscriptions.get(subscription) || []).concat(userId));
        if (this.reverseSubscriptions.get(subscription)?.length === 1) {
            this.connection
                .then(() => this.redisClient.subscribe(subscription, this.redisCallbackHandler))
                .catch((err) => console.error(`Failed to subscribe to ${subscription}`, err));
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        try {
            const parsedMessage: OutgoingMessage = JSON.parse(message);
            this.reverseSubscriptions.get(channel)?.forEach(s => UserManager.getInstance().getUser(s)?.emit(parsedMessage));
        } catch (err) {
            console.error(`Invalid message received on ${channel}`, err);
        }
    }

    public unsubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));
        }
        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter(s => s !== userId));
            if (this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                this.connection
                    .then(() => this.redisClient.unsubscribe(subscription))
                    .catch((err) => console.error(`Failed to unsubscribe from ${subscription}`, err));
            }
        }
    }

    public userLeft(userId: string) {
        console.log("user left " + userId);
        this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId, s));
        this.subscriptions.delete(userId);
    }

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
}
