import express from "express"; 
import { messageService } from "../service/messageService";
import { requireAuth, type AuthedRequest } from "../modules/authMiddleware";
import { chatRepository } from "../repository/chatRepository";
import {upload} from "../config/upload";


const router = express.Router();

/*
Send a new message to a chat
POST http://localhost:3000/api/messages/new
Headers: Content-Type: application/json
Body (raw JSON):
{
  "sender": 1,
  "chatId": 5,
  "text": "Hello, this is a test message"
}
*/
router.post("/new", requireAuth, async (req, res) => {
    try {
        const sender = (req as AuthedRequest).userId;
        const chatId = req.body?.chatId;
        const text = req.body?.text;

        if (!chatId || !text) {
            return res.status(400).json({ error: "Missing required fields: chatId, text" });
        }
        const isMember = await chatRepository.isUserInChat(Number(chatId), sender);
        if (!isMember) {
            return res.status(403).json({ error: "Not a member of this chat" });
        }

        const id = await messageService.sendMessage(sender, Number(chatId), text);
        res.status(201).json({ success: true, messageId: id });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


/*
Get a message by its ID
GET http://localhost:3000/api/messages/:id
*/
router.get("/:id", async (req, res) => {
  try {
    const message = await messageService.getMessageById(Number(req.params.id));
    res.status(200).json({ success: true, data: message });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/*
Edit an existing message
PUT http://localhost:3000/api/messages/:id
Headers: Content-Type: application/json
Body (raw JSON):
{
  "sender": 1,
  "text": "Updated message text"
}
*/
router.put("/:id", async (req, res) => {
  try {
    const { sender, text } = req.body;
    const messageId = Number(req.params.id);
    
    if (!sender || !text) {
      return res.status(400).json({ error: "Missing required fields: sender, text" });
    }
    
    await messageService.editMessage(messageId, Number(sender), text);
    res.status(200).json({ success: true, message: "Message updated" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/*
Get all messages for a chat (ordered by time, oldest first)
GET http://localhost:3000/api/messages/chat/:chatId
*/
router.get("/chat/:chatId", async (req, res) => {    //requireAuth,
    try {
        const userId = req.body?.userId;              //(req as AuthedRequest).userId;
        const chatId = Number(req.params.chatId);

        const isMember = await chatRepository.isUserInChat(chatId, userId);
        if (!isMember) {
            return res.status(403).json({ error: "Not a member of this chat" });
        }

        const messages = await messageService.getChatMessages(chatId);
        res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


/*
Delete a message
DELETE http://localhost:3000/api/messages/:id
Headers: Content-Type: application/json
Body (raw JSON):
{
  "sender": 1
}
*/
router.delete("/:id", async (req, res) => {
  try {
    const { sender } = req.body;
    const messageId = Number(req.params.id);
    
    if (!sender) {
      return res.status(400).json({ error: "Missing required field: sender" });
    }
    
    await messageService.deleteMessage(messageId, Number(sender));
    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/*
Send a new message to a chat
POST http://localhost:3000/api/messages/new
Headers: Content-Type: application/json
Body (form-data):
{
  "chatId": 5,
  "text": "Hello, this is a test message"
  "file": example.docx
}
*/
router.post("/sendFile", requireAuth,  upload.single("file"), async (req, res) => {
    try {
        const sender = (req as AuthedRequest).userId;
        const chatId = req.body?.chatId;
        const message = req.body?.text;
        const file = req.file;
        const link = 'https://localhost:3000/documents/' + file?.filename;
        

        if (!file) return res.status(400).send("No file uploaded");
        if (!chatId) { return res.status(400).json({ error: "Missing required fields: chatId, text" }); }
        const isMember = await chatRepository.isUserInChat(Number(chatId), sender);
        if (!isMember) { return res.status(403).json({ error: "Not a member of this chat" }); }

        const id = await messageService.sendFile(sender, chatId, message, link)
        res.status(201).json({ success: true, messageId: id, link: link });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;