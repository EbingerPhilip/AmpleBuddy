import { Router } from "express";
import { chatService } from "../service/chatService";

const router = Router();

/*
Create a new chat with given members
POST http://localhost:3000/api/chats/new
Headers: Content-Type: application/json
Body (raw JSON):
{
  "members": [1, 2]
}
*/
router.post("/new", async (req, res) => {
  try {
    const { members } = req.body as { members: number[] };
    const chatId = await chatService.createChat(members);
    res.status(201).json({ chatId });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Get chat details by chatId (includes members and message IDs)

GET http://localhost:3000/api/chats/:chatId

*/
router.get("/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const chat = await chatService.getChatById(chatId);
    res.json(chat);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/*
Get all chats for a user
GET http://localhost:3000/api/chats/user/:userId
*/
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const chats = await chatService.getUserChats(userId);
    res.json(chats);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Self-removal of a member from a chat (only the user themself)
DELETE http://localhost:3000/api/chats/:chatId/self-remove/:userId
Headers: Content-Type: application/json
Body (raw JSON):
{
  "requesterUserId": 7 // Not included in URL because it is technically additonal info
}
*/
router.delete("/:chatId/self-remove/:userId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const userIdToRemove = Number(req.params.userId);
    const { requesterUserId } = req.body as { requesterUserId: number };
    await chatService.removeMember(chatId, userIdToRemove, requesterUserId);
    res.status(200).json({ message: "Successfully removed!" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;