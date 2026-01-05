import express = require("express");
import path = require("path");
import cors = require("cors");
import { registerSystemRoutes } from "./server/apiAuth";
import { registerUserRoutes } from "./server/apiUser";
import messageRoutes from "./routes/messageRoutes";
import  ScheduledMessageRoutes from "./routes/scheduledMessageRoutes";
import chatRoutes from "./routes/chatRoutes";
import preferencesRoutes from "./routes/preferencesRoutes";
import userRoutes from "./routes/userRoutes";
import  groupChatRoutes  from "./routes/groupChatRoutes";
import previewRoutes from "./routes/previewRoutes";


const app = express();
app.use(cors());          
app.use(express.json());
const PORT = 3000;

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
app.use("/api/groupchats", groupChatRoutes);
app.use("/api/previews", previewRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend running at http://localhost:4000`);
});