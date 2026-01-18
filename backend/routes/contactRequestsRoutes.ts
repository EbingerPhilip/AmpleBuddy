import {Router} from "express";
import {contactRequestsService} from "../service/contactRequestsService";
import {contactsService} from "../service/contactsService";
import {userService} from "../service/userService";
import {requireAuth, type AuthedRequest} from "../modules/authMiddleware";

const router = Router();

/*
GET my incoming contact requests
GET /api/contactRequests/mine
*/
router.get("/mine", requireAuth, async (req, res) => {
    const userId = (req as AuthedRequest).userId;
    const requests = await contactRequestsService.getContactRequests(userId);
    res.status(200).json({success: true, requests});
});


/*
Send a contact request by username
POST /api/contactRequests/send
Body: { "username": "..." }
*/
router.post("/send", requireAuth, async (req, res) => {
    try {
        const ownerId = (req as AuthedRequest).userId;
        const username = String(req.body?.username ?? "").trim();

        if (!username) return res.status(400).json({error: "Username mustn't be empty"});

        const target = await userService.getUserByUsername(username);
        if (!target) return res.status(404).json({error: "User not found"});
        if (target.userid === ownerId) return res.status(400).json({error: "Cannot send request to yourself"});

        await contactRequestsService.createContactRequest(target.userid, ownerId);
        res.status(201).json({success: true});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

/*
Accept a contact request (requester -> owner)
POST /api/contactRequests/accept
Body: { "requesterId": number }
*/
router.post("/accept", requireAuth, async (req, res) => {
    try {
        const ownerId = (req as AuthedRequest).userId;
        const requesterId = Number(req.body?.requesterId);

        if (!requesterId) return res.status(400).json({error: "Missing requesterId"});

        // create contact + delete request
        await contactsService.createContact(ownerId, requesterId);
        await contactRequestsService.deleteContactRequest(ownerId, requesterId);

        res.status(200).json({success: true});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

/*
Deny a contact request
POST /api/contactRequests/deny
Body: { "requesterId": number }
*/
router.post("/deny", requireAuth, async (req, res) => {
    try {
        const ownerId = (req as AuthedRequest).userId;
        const requesterId = Number(req.body?.requesterId);

        if (!requesterId) return res.status(400).json({error: "Missing requesterId"});

        await contactRequestsService.deleteContactRequest(ownerId, requesterId);
        res.status(200).json({success: true});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

export default router;
