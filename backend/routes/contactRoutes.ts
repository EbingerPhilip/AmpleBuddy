import { Router } from "express";
import { contactsService } from "../service/contactsService";
import { requireAuth, type AuthedRequest } from "../modules/authMiddleware";
import {moodHistoryRepository} from "../repository/moodHistoryRepository";
import { userService } from "../service/userService";
import path = require("path");
import fs = require("fs");

const router = Router();

/*
Created a new Contact between two users in the db.

POST: http://localhost:3000/api/contacts/saveContact

Request:
Which user is the initiator and which the receiver does not matter in the end.

Header: -
Body:
{
    "userId1":"2",
    "userId2":"7"
}

Response:
{
    "success": true
}
 */

router.post("/saveContact", async (req,res) =>{
    try {
        const {userId1, userId2} = req.body;

        if(!userId1 || !userId2){
            return res.status(400).json({ error: "Missing or invalid user IDs" });
        }

        const response = await contactsService.createContact(userId1, userId2);

        res.status(201).json({ success: true, response: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/*
Returns a array with all the contacts from a user.

GET: http://localhost:3000/api/contacts/getContacts/:userId

Request:
userId: The user from which teh contacts are requested.

Header: -
Body: -

Response:
{
    "success": true,
    "contacts": [
        {
            "userid1": 2,
            "userid2": 1
        },
        {
            "userid1": 2,
            "userid2": 3
        },
        {
            "userid1": 2,
            "userid2": 7
        }
    ]
}
 */
router.get("/getContacts/:userId", async (req,res) =>{
    try {
        const userId = Number(req.params.userId);

        if(!userId){
            return res.status(400).json({ error: "Missing or invalid user ID" });
        }

        const response = await contactsService.getContacts(userId);
        res.status(201).json({ success: true, contacts: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/*
Delete contact between two users by there ID.

PUT http://localhost:3000/api/contacts/deleteContact

Request:
Header: -
Body:
{
    "userId1":"2",
    "userId2":"3"
}

Response:
{
    "success": true
}

 */
router.put("/deleteContact", async (req, res) => {
    try {
        const {userId1, userId2} = req.body;

        if(!userId1 || !userId2){
            return res.status(400).json({ error: "Missing or invalid user IDs" });
        }
        await contactsService.deleteContacts(userId1, userId2);
        res.status(200).json({ success: true});
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// View a contact's public profile (must be a contact)
router.get("/:userId", requireAuth, async (req, res) => {
    try {
        const me = (req as AuthedRequest).userId;
        const targetId = Number(req.params.userId);

        const ok = await contactsService.areContacts(me, targetId);
        if (!ok) return res.status(403).json({ error: "Not a contact" });

        const user = await userService.getUserById(targetId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const pic = path.join(__dirname, "../../backend/public/profile-pics", `${targetId}.png`);
        const hasProfilePic = fs.existsSync(pic);

        const { password, ...safeUser } = user;

        res.status(200).json({
            success: true,
            data: {
                userid: safeUser.userid,
                nicknames: safeUser.nicknames,
                pronouns: safeUser.pronouns,
                dobHidden: Number(safeUser.dobHidden) as 0 | 1,
                dateOfBirth: safeUser.dateOfBirth,
                dailyMood: safeUser.dailyMood,
                hasProfilePic,
                profilePicUrl: hasProfilePic ? `/profile-pics/${targetId}.png` : null,
            }
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get a contact's mood history (must be a contact)
router.get("/:userId/moodhistory", requireAuth, async (req, res) => {
    try {
        const me = (req as AuthedRequest).userId;
        const targetId = Number(req.params.userId);

        const ok = await contactsService.areContacts(me, targetId);
        if (!ok) return res.status(403).json({ error: "Not a contact" });

        const rows = await moodHistoryRepository.getMoodHistory(targetId);
        const data = rows.map((r: any) => ({
            ...r,
            date: typeof r.date === "string" ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
        }));

        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


export default router;