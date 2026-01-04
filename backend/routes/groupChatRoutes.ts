import { Router } from "express";
import { groupChatService } from "../service/groupChatService";

const router = Router();

/*
Create a new group chat
POST http://localhost:3000/api/groupchats/create
Headers: Content-Type: application/json
Body (raw JSON):
{
  "members": [1, 2, 3],
  "groupname": "TestGroupChat",
  "currentUserId": 1
}
*/
router.post("/create", async (req, res) => {
  try {
    const { members, groupname, currentUserId } = req.body as {
      members: number[];
      groupname: string;
      currentUserId: number;
    };

    if (!members || !Array.isArray(members) || !groupname || !currentUserId) {
      return res.status(400).json({
        error: "Missing required fields: members, groupname, currentUserId"
      });
    }

    const chatId = await groupChatService.createGroupChat(members, groupname, currentUserId);
    res.status(201).json({ chatId });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Get group chat details by chatId (includes members, message IDs, groupname, and admin)
GET http://localhost:3000/api/groupchats/:chatId
*/
router.get("/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const groupChat = await groupChatService.getGroupChatById(chatId);
    res.json(groupChat);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/*
Add user to group chat (admin only)
PUT http://localhost:3000/api/groupchats/add
Headers: Content-Type: application/json
Body (raw JSON):
{
  "chatId": 5,
  "targetUserId": 4,
  "currentUserId": 1
}
*/
router.put("/add", async (req, res) => {
  try {
    const { chatId, targetUserId, currentUserId } = req.body as {
      chatId: number;
      targetUserId: number;
      currentUserId: number;
    };

    if (!chatId || !targetUserId || !currentUserId) {
      return res.status(400).json({
        error: "Missing required fields: chatId, targetUserId, currentUserId"
      });
    }

    const success = await groupChatService.addUserToGroupChat(chatId, targetUserId, currentUserId);
    res.status(200).json({ success, message: "User added to group chat" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Remove user from group chat (admin + add selfremove!)
PUT http://localhost:3000/api/groupchats/remove
Headers: Content-Type: application/json
Body (raw JSON):
{
  "chatId": 5,
  "targetUserId": 2,
  "currentUserId": 1
}
*/
router.put("/remove", async (req, res) => {
  try {
    const { chatId, targetUserId, currentUserId } = req.body as {
      chatId: number;
      targetUserId: number;
      currentUserId: number;
    };

    if (!chatId || !targetUserId || !currentUserId) {
      return res.status(400).json({
        error: "Missing required fields: chatId, targetUserId, currentUserId"
      });
    }

    const success = await groupChatService.removeUserFromGroupChat(chatId, targetUserId, currentUserId);
    res.status(200).json({ success, message: "User removed from group chat" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Rename group chat (admin only)
PUT http://localhost:3000/api/groupchats/:chatId/rename
Headers: Content-Type: application/json
Body (raw JSON):
{
  "newGroupName": "Updated Group Name",
  "currentUserId": 1
}
*/
router.put("/:chatId/rename", async (req, res) => {
  try {
    const { newGroupName, currentUserId } = req.body as {
      newGroupName: string;
      currentUserId: number;
    };

    if (!newGroupName || !currentUserId) {
      return res.status(400).json({
        error: "Missing required fields: newGroupName, currentUserId"
      });
    }

    const chatId = Number(req.params.chatId);
    const success = await groupChatService.renameGroupChatById(chatId, currentUserId, newGroupName);
    res.status(200).json({ success, message: "Group chat renamed" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;