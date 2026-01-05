import { Router } from "express";
import { contactsService } from "../service/contactsService";

const router = Router();

router.post("/saveContact", async (req,res) =>{
    try {
        const {userId1, userId2} = req.body;

        if(!userId1 || !userId2){
            return res.status(400).json({ error: "Missing or invalid user IDs" });
        }

        const response = await contactsService.createContact(userId1, userId2);
        // TODO: What is the response?

        res.status(201).json({ success: true, response: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get("/getContacts/:userId", async (req,res) =>{
    try {
        const userId = Number(req.params.userId);

        console.log(userId);

        if(!userId){
            return res.status(400).json({ error: "Missing or invalid user ID" });
        }

        const response = await contactsService.getContacts(userId);
        console.log(response);
        res.status(201).json({ success: true, response: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/*
Delete contact between two users by there ID.
GET http://localhost:3000/api/users/deleteContact/:userID
 */
router.put("/deleteContact/:userId", async (req, res) => {
    try {
        const userId1 = Number(req.params.userId);
        const userId2 = req.body;
        await contactsService.deleteContacts(userId1, userId2);
        res.status(200).json({ success: true, message: "Contact deleted" });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


export default router;