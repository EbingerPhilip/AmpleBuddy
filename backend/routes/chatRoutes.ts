import {requireAuth, type AuthedRequest} from "../modules/authMiddleware";
import {groupChatService} from "../service/groupChatService";
import {userService} from "../service/userService";
import {Router} from "express";
import {chatService} from "../service/chatService";

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
        const {members} = req.body as { members: number[] };
        const chatId = await chatService.createChat(members);
        res.status(201).json({chatId});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
    }
});

/*
Get chat title for UI:
- if group chat: groupname
- if 1-to-1: other user's nickname
GET /api/chats/:chatId/title
*/
router.get("/:chatId/title", requireAuth, async (req, res) => {
    try {
        const chatId = Number(req.params.chatId);
        const me = (req as AuthedRequest).userId;

        // 1) Try group chat first
        try {
            const gc = await groupChatService.getGroupChatById(chatId);
            if (gc?.groupname) {
                return res.status(200).json({success: true, title: gc.groupname});
            }
        } catch {
            // not a group chat -> fall through
        }

        // 2) Normal chat -> title is the other member's nickname
        const chat = await chatService.getChatById(chatId);
        const otherId = (chat.members ?? []).find((id: number) => id !== me);

        if (!otherId) {
            return res.status(200).json({success: true, title: "Chat"});
        }

        const otherUser = await userService.getUserById(otherId);
        const title = otherUser?.nicknames ?? "Chat";
        return res.status(200).json({success: true, title});
    } catch (err) {
        return res.status(400).json({error: (err as Error).message});
    }
});

/*
Pseudonymize and decouple user from chat: 
1: remove user from chatmembers table 
2a: If chat has remaining members: pseudonymize userId for decoupled user (e.g., 1)
2b: If no remaining members: delete chat and all messages (cleanup tables chatdata and messages)
PUT http://localhost:3000/api/chats/:chatId/decouple
Headers: Content-Type: application/json
Body (raw JSON):
{
  "userId": 2
}
*/
router.put("/:chatId/decouple", requireAuth, async (req, res) => {
    try {
        const chatId = Number(req.params.chatId);
        const userId = (req as AuthedRequest).userId;
        if (!userId) {
            return res.status(400).json({error: "Missing required field: userId"});
        }

        const result = await chatService.decoupleUserFromChat(chatId, userId, 1);
        res.status(200).json({
            success: true,
            message: result.chatDeleted
                ? "User decoupled and chat deleted (no members left)"
                : "User decoupled and messages pseudonymized",
            ...result, // spread userDecoupled and chatDeleted flags
        });
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

export default router;