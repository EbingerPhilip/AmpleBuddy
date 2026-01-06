import { Router } from "express";
import { contactRequestsService } from "../service/contactRequestsService";
import {contactsService} from "../service/contactsService";
import {contactRequestsReposetory} from "../repository/contactRequestsReposetory";

const router = Router();

/*
Accepts a contact Request. Deletes the Request in the Requests table and adds teh contact to the contact table.

POST: http://localhost:3000/api/contactRequests/acceptContact

Request:
Head: -
Body:
{
    "userIdOwner":"2",
    "userIdRequester":"5"
}

Response:
{
    "success": true
}
*/
router.post("/acceptContact", async (req,res) =>{
    try {
        const {userIdOwner, userIdRequester} = req.body;

        if(!userIdOwner || !userIdRequester) return res.status(400).json({ error: "Missing or invalid user IDs" });

        await contactsService.createContact(userIdOwner, userIdRequester);

        await contactRequestsService.deleteContactRequest(userIdOwner,userIdRequester);

        res.status(201).json({ success: true});
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/*
Delete contact between two users by there ID.
GET http://localhost:3000/api/contactRequests/rejectContact

Request:
Header: -
Body:
{
    "userIdOwner":"2",
    "userIdRequester":"6"
}

Response:
{
    "success": true
}
 */
router.post("/rejectContact", async (req, res) => {
    try {
        const {userIdOwner, userIdRequester} = req.body;
        if(!userIdOwner || !userIdRequester) return res.status(400).json({ error: "Missing or invalid user IDs" });
        const a = await contactRequestsService.deleteContactRequest(userIdOwner, userIdRequester);

        res.status(200).json({ success: true});
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});


/*
Returns the contact Requests of a specific user.

GET: http://localhost:3000/api/contactRequests/getContactRequests/:userId

userId: The user id of teh user who got the requests.

Request:
Header: -
Body: -

Response:
{
    "success": true,
    "contacts": [
        {
            "useridOwner": 2,
            "useridRequester": 5
        },
        {
            "useridOwner": 2,
            "useridRequester": 6
        }
    ]
}
 */
router.get("/getContactRequests/:userId", async (req,res) =>{
    try {
        const userId = Number(req.params.userId);

        if(!userId){
            return res.status(400).json({ error: "Missing or invalid user ID" });
        }

        const response = await contactRequestsService.getContactRequests(userId);

        res.status(201).json({ success: true, contacts: response });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


export default router;