import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const PORT = parseInt(process.env.PORT || "3001");
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws, request) => {
    const url = new URL(request.url || "/", "http://localhost");
    const exchangeUserId = url.searchParams.get("userId") || undefined;
    UserManager.getInstance().addUser(ws, exchangeUserId);
});
