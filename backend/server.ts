import express = require("express");
import path = require("path");
import cors = require("cors");
import https = require("https");
import fs = require("fs");
import dotenv = require("dotenv");
import { registerSystemRoutes } from "./server/apiAuth";
import { registerUserRoutes } from "./server/apiUser";
import messageRoutes from "./routes/messageRoutes";
import  ScheduledMessageRoutes from "./routes/scheduledMessageRoutes";
import chatRoutes from "./routes/chatRoutes";
import preferencesRoutes from "./routes/preferencesRoutes";
import userRoutes from "./routes/userRoutes";
import contactRoutes from "./routes/contactRoutes";
import contactRequestsRoutes from "./routes/contactRequestsRoutes";
import  groupChatRoutes  from "./routes/groupChatRoutes";
import previewRoutes from "./routes/previewRoutes";

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

app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

registerSystemRoutes(app);
registerUserRoutes(app);
app.use("/api/messages", messageRoutes);
app.use("/api/scheduledMessage", ScheduledMessageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/users", userRoutes);
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

const server = https.createServer(httpsOptions, app);
server.listen(PORT, () => {
    console.log(`[BOOT] Server running at https://localhost:${PORT}`);
});
