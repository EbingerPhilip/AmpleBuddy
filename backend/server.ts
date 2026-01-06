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
import contactRoutes from "./routes/contactRoutes";
import contactRequestsRoutes from "./routes/contactRequestsRoutes";
import  groupChatRoutes  from "./routes/groupChatRoutes";
import previewRoutes from "./routes/previewRoutes";


const app = express();
app.use(cors());          
app.use(express.json());
const PORT = 3000;

const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/test/user", (_req, res) => {
  const TestUser = {
    username: "max.musterman@gmail.com",
    nickname: "max",
    userid: 9999,
    Contacts: [
      {nickname: "philip", userid : 1, username : "blablabla"},
      {nickname: "marvin", userid : 2, username : "blablabla"},
      {nickname: "martin", userid : 3, username : "blablabla"},
    ],
  }

res.status(200).json(TestUser)
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend running at http://localhost:4000`);
});