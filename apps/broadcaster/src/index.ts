import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const PORT = parseInt(process.env.PORT || "3001");
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

