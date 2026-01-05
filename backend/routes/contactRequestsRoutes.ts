import { Router } from "express";
import { contactRequestsService } from "../service/contactRequestsService";
import {contactsService} from "../service/contactsService";
import {contactRequestsReposetory} from "../repository/contactRequestsReposetory";

const router = Router();

/*
Get user by ID
GET http://localhost:3000/api/users/:userId
*/
router.post("/acceptContact", async (req,res) =>{
    try {
        const {userIdOwner, userIdRequester} = req.body;

        if(!userIdOwner || !userIdRequester) return res.status(400).json({ error: "Missing or invalid user IDs" });

        const response = await contactsService.createContact(userIdOwner, userIdRequester);
        // TODO: What is the response?
        console.log(response);

        const dbResponseContactRequests = await contactRequestsService.deleteContactRequest(userIdOwner,userIdRequester);
        console.log(dbResponseContactRequests);

        res.status(201).json({ success: true});
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/*
Delete contact between two users by there ID.
GET http://localhost:3000/api/users/deleteContact/:userID
 */
router.post("/rejectContact", async (req, res) => {
    try {
        const {userIdOwner, userIdRequester} = req.body;
        if(!userIdOwner || !userIdRequester) return res.status(400).json({ error: "Missing or invalid user IDs" });
        const dbResponse = await contactRequestsService.deleteContactRequest(userIdOwner, userIdRequester);
        console.log(dbResponse);
        res.status(200).json({ success: true, message: dbResponse });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.get("/getContactRequests/:userId", async (req,res) =>{
    try {
        const userId = Number(req.params.userId);

        if(!userId){
            return res.status(400).json({ error: "Missing or invalid user ID" });
        }

        const response = await contactRequestsService.getContactRequests(userId);

        res.status(201).json({ success: true, response: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


export default router;