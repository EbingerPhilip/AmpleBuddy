import {Router} from "express";
import {groupChatService} from "../service/groupChatService";
import {requireAuth, type AuthedRequest} from "../modules/authMiddleware";

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
router.post("/create", requireAuth, async (req, res) => {
    try {
        const currentUserId = (req as AuthedRequest).userId;
        const {members, groupname} = req.body as {
            members: number[];
            groupname: string;
        };

        if (!members || !Array.isArray(members) || !groupname) {
            return res.status(400).json({
                error: "Missing required fields: members, groupname"
            });
        }

        const chatId = await groupChatService.createGroupChat(members, groupname, currentUserId);
        res.status(201).json({chatId});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
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
        res.status(404).json({error: (err as Error).message});
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
router.put("/add", requireAuth, async (req, res) => {
    try {
        const currentUserId = (req as AuthedRequest).userId;
        const {chatId, targetUserId} = req.body as {
            chatId: number;
            targetUserId: number;
        };

        if (!chatId || !targetUserId) {
            return res.status(400).json({
                error: "Missing required fields: chatId, targetUserId"
            });
        }

        const success = await groupChatService.addUserToGroupChat(chatId, targetUserId, currentUserId);
        res.status(200).json({success, message: "User added to group chat"});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
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
router.put("/remove", requireAuth, async (req, res) => {
    try {
        const currentUserId = (req as AuthedRequest).userId;
        const {chatId, targetUserId} = req.body as {
            chatId: number;
            targetUserId: number;
        };

        if (!chatId || !targetUserId) {
            return res.status(400).json({
                error: "Missing required fields: chatId, targetUserId"
            });
        }

        const success = await groupChatService.removeUserFromGroupChat(chatId, targetUserId, currentUserId);
        res.status(200).json({success, message: "User removed from group chat"});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
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
router.put("/:chatId/rename", requireAuth, async (req, res) => {
    try {
        const currentUserId = (req as AuthedRequest).userId;
        const {newGroupName} = req.body as {
            newGroupName: string;
        };

        if (!newGroupName) {
            return res.status(400).json({
                error: "Missing required field: newGroupName"
            });
        }

        const chatId = Number(req.params.chatId);
        const success = await groupChatService.renameGroupChatById(chatId, currentUserId, newGroupName);
        res.status(200).json({success, message: "Group chat renamed"});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
    }
});

// Change admin (admin only)
// PUT /api/groupchats/:chatId/admin
// Body: { "newAdminId": 123 }
router.put("/:chatId/admin", requireAuth, async (req, res) => {
    try {
        const chatId = Number(req.params.chatId);
        const currentUserId = (req as AuthedRequest).userId;
        const {newAdminId} = req.body as { newAdminId: number };

        if (!newAdminId) {
            return res.status(400).json({error: "Missing required field: newAdminId"});
        }

        await groupChatService.setGroupChatAdmin(chatId, Number(newAdminId), currentUserId);
        res.status(200).json({success: true, message: "Admin updated"});
    } catch (err) {
        res.status(400).json({error: (err as Error).message});
    }
});

export default router;