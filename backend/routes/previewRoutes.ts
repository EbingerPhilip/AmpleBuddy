import { Router } from "express";
import { previewService } from "../service/previewService";
import { requireAuth, AuthedRequest } from "../modules/authMiddleware";
import { decrypt } from "../config/encryption";

const router = Router();

/*
Get all chat previews (1-to-1 and group chats mixed, sorted by latest message)
Optional group parameter filters by chat type
GET http://localhost:3000/api/previews/all/:userId?group=true  (group chats only)
GET http://localhost:3000/api/previews/all/:userId?group=false (1-to-1 chats only)
GET http://localhost:3000/api/previews/all/:userId              (both mixed)
Headers: Content-Type: application/json

Returns (200):
[{
    "chatId": 8,
    "group": 1,
    "sender": 1,
    "text": "See you later!",
    "otherUserId": null,
    "otherUserNickname": null,
    "sendernickname": "Nick",
    "groupname": "Suck it - vampire style!",
    "messageId": 11
}]

Headers: Content-Type: application/json
*/
router.get("/chats/all", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const groupParam = req.query.group as string | undefined;

    // Note to self: There is no point in using Query Paramenters, if we dont pass them on to the service!
    let group: boolean | undefined = undefined;
    if (groupParam === "true") { group = true; }
    else if (groupParam === "false") { group = false; }

    const previews = await previewService.loadAllChatPreviewsForUser(userId, group);

    res.json(previews.map((row: any) => ({
      ...row,
      text: row.text ? decrypt(row.text) : null
    })));

  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/*
Get chat previews for user dashboard (1-to-1 chats only)
Includes minimal info - note that a uniform function to load all chats is available
GET http://localhost:3000/api/previews/chats/:userId

Returns (200): 

 [{
      "chatId": 5,
      "sender": 2,
      "text": "...",
      "otherUserId": 3,
      "otherUserNickname": "Nick"
  }]

Headers: Content-Type: application/json
*/
router.get("/chats/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const previews = await previewService.loadMinimalChatPreviewsForUser(userId);
    res.json(previews.map((row: any) => ({
      ...row,
      text: row.text ? decrypt(row.text) : null
    })));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});


/*
Get group chat previews for user dashboard (group chats only)
Includes minimal info - note that a uniform function to load all chats is available
GET http://localhost:3000/api/previews/groupchats/:userId

Returns (200):
[{
      "chatId": 8,
      "sender": 1,
      "sendernickname": "Nick",
      "text": "See you later!",
      "groupname": "Suck it - vampire style!"
  }]

Headers: Content-Type: application/json
*/

router.get("/groupchats/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const previews = await previewService.loadMinimalGroupChatPreviewsForUser(userId);
    res.json(previews.map((row: any) => ({
      ...row,
      text: row.text ? decrypt(row.text) : null
    })));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;