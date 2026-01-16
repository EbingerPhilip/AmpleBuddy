import express = require("express");
import path = require("path");
import cors = require("cors");
import https = require("https");
import fs = require("fs");
import dotenv = require("dotenv");
import messageRoutes from "./routes/messageRoutes";
import ScheduledMessageRoutes from "./routes/scheduledMessageRoutes";
import chatRoutes from "./routes/chatRoutes";
import preferencesRoutes from "./routes/preferencesRoutes";
import userRoutes from "./routes/userRoutes";
import contactRoutes from "./routes/contactRoutes";
import contactRequestsRoutes from "./routes/contactRequestsRoutes";
import groupChatRoutes  from "./routes/groupChatRoutes";
import previewRoutes from "./routes/previewRoutes";
import {AuthedRequest} from "./modules/authMiddleware";
import {chatRepository} from "./repository/chatRepository";
import {messageService} from "./service/messageService";
import {chatService} from "./service/chatService";
import {messageRepository} from "./repository/messageRepository";
import {Server} from 'socket.io';


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = Number(process.env.PORT ?? 3000);


console.log("[BOOT] Starting backend…");
console.log("[BOOT] CWD:", process.cwd());
console.log("[BOOT] __dirname:", __dirname);
console.log("[BOOT] PORT:", process.env.PORT);
console.log("[BOOT] HTTPS_KEY_PATH:", process.env.HTTPS_KEY_PATH);
console.log("[BOOT] HTTPS_CERT_PATH:", process.env.HTTPS_CERT_PATH);


const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));
app.use(
  "/profile-pics",
  express.static(path.join(__dirname, "../backend/public/profile-pics"))
);
app.use(
  "/documents",
  express.static(path.join(__dirname, "../backend/public/documents"))
);


app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.use("/api/messages", messageRoutes);
app.use("/api/scheduledMessage", ScheduledMessageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/contactRequests", contactRequestsRoutes);
app.use("/api/groupchats", groupChatRoutes);
app.use("/api/previews", previewRoutes);

const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH;
if (!HTTPS_KEY_PATH || !HTTPS_CERT_PATH) {
    console.error(
        "Missing HTTPS_KEY_PATH or HTTPS_CERT_PATH" +
        "Set them to enable HTTPS in the .env file."
    );
    process.exit(1);
}
const httpsOptions = {
    key: fs.readFileSync(HTTPS_KEY_PATH),
    cert: fs.readFileSync(HTTPS_CERT_PATH),
};

// SPA fallback
app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});


const server = https.createServer(httpsOptions, app);
server.listen(PORT, () => {
    console.log(`[BOOT] Server running at https://localhost:${PORT}`);
});


/*
Web Sockets
 */


const io = new Server(server);

interface ActiveUsers {
    userId: number;
    chatId: number;
    socketId: string;
}

let activeUsers: ActiveUsers[] = [];

// @ts-ignore
io.on('connection', socket => {
    console.log(`Socket ID: ${socket.id} connected`);
    // Optional: Verification that the client is a valid user

    socket.on('enterChat', (userId: number, chatId: number) => {
        activeUsers.push({userId: userId, chatId: chatId, socketId: socket.id});
    });

    socket.on('disconnect', () => {
        activeUsers = activeUsers.filter(user => user.socketId !== socket.id)
        console.log(`Socket ID: ${socket.id} disconnected`)
    });

    socket.on('sendmessage', async (sender: number, chatId: number, text: string) =>  {
        try {

            if (!chatId || !text) {
                socket.emit('serverResponseError', {status: "400", error: "Missing required fields: chatId, text"});
                return;
            }
            const isMember = await chatRepository.isUserInChat(Number(chatId), sender);
            if (!isMember) {
                socket.emit('serverResponseError', {status: "403", error: "Not a member of this chat"});
                return;
            }

            const msgId = await messageService.sendMessage(sender, Number(chatId), text);
            socket.emit('sendMessageResponse', {status: "201", success: true, messageId: msgId});

            const chatMembers = (await chatService.getChatMembers(chatId)).filter(x => x !== sender);

            for (const chatMembersKey in chatMembers) {
                let user = activeUsers.find(x => x.userId == Number(chatMembersKey));
                if(user){
                    const message = await messageRepository.getMessageById(msgId);
                    socket.to(user.socketId).emit('sendmessage', { success: true, data: message });
                }
            }
        } catch (error: any) {
            socket.emit('serverResponseError', {status: "400", error: error.message});
        }
    });

    socket.on('editmessage', async (sender: number, text: string, messageId: number) => {
        try {
            if (!sender || !text) {
                socket.emit('serverResponseError', {status: "400", error: "Missing required fields: sender, text"});
                return;
            }

            await messageService.editMessage(messageId, Number(sender), text);
            socket.emit('editMessage', {status: "200", success: true, message: "Message updated"});
        } catch (error: any) {
            socket.emit('serverResponseError', {status: "400", error: error.message});
        }
    });

    socket.on('deletemessage', async (sender: number, messageId: number) => {
        try {
            if (!sender) {
                socket.emit('serverResponseError', {status: "400", error: "Missing required field: sender"});
                return;
            }

            await messageService.deleteMessage(messageId, Number(sender));
            socket.emit('deleteMessages', {status: "200", success: true, message: "Message deleted"});
        } catch (error: any) {
            socket.emit('serverResponseError', {status: "400", error: error.message});
        }
    });

    socket.on('getallmessages', async (userId: number, chatId: number) => {
        try {
            const isMember = await chatRepository.isUserInChat(chatId, userId);
            if (!isMember) {
                socket.emit('serverResponseError', {status: "403", error: "Not a member of this chat"});
            }

            const messages = await messageService.getChatMessages(chatId);
            socket.emit('allMessages', {status: "200", success: true, data: messages});
        } catch (error: any) {
            socket.emit('serverResponseError', {status: "400", error: error.message});
        }
    })
})

// @ts-ignore
io.on('disconnect', (socket) => {
    activeUsers = activeUsers.filter(x => x.socketId === socket.id);
})