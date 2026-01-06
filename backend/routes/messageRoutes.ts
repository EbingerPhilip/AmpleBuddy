import express from "express"; 
import { messageService } from "../service/messageService";

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
router.post("/new", async (req, res) => {
  try {
    const sender = req.body?.sender;
    const chatId = req.body?.chatId;
    const text = req.body?.text;
    
    console.log("Request body:", req.body);
    
    if (!sender || !chatId || !text) {
      return res.status(400).json({ error: "Missing required fields: userId, chatId, text" });
    }
    
    const id = await messageService.sendMessage(Number(sender), Number(chatId), text);
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
router.get("/chat/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
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

export default router;