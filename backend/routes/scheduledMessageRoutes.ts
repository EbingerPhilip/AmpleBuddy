import express from "express";
import {scheduledMessageService} from "../service/scheduledMessageService";

const router = express.Router();

type Trigger = 'Red Day' | 'Yellow Day' | 'Date';

/*
Create a new scheduled message
Note that only one trigger is implemented per scheduled message (see Service for implementation details)

POST http://localhost:3000/api/scheduledMessage/new
Headers: Content-Type: application/json

Body (raw JSON) - Color trigger (Red Day or Yellow Day):
{
  "userId": 1,
  "text": "Don't forget your appointment!",
  "trigger": "Red Day"
}

Body (raw JSON) - Date trigger:
{
  "userId": 1,
  "text": "Don't forget your appointment!",
  "trigger": "Date",
  "duedate": "2026-01-15T10:00:00Z"
}
*/
router.post("/new", async (req, res) => {
    try {
        const userId = req.body?.userId;
        const text = req.body?.text;
        const trigger = req.body?.trigger as Trigger;
        const duedate = req.body?.duedate ? new Date(req.body.duedate) : null;

        if (!userId || !text || !trigger) {
            return res.status(400).json({
                error: "Missing required fields: userId, text, trigger"
            });
        }

        const messageId = await scheduledMessageService.sendScheduledMessage(userId, text, trigger, duedate);
        res.status(201).json({success: true, messageId});
    } catch (error: any) {
        res.status(400).json({error: error.message});
    }
});


/*
Get all scheduled messages for a user
GET http://localhost:3000/api/scheduledMessage/user/:userId
*/
router.get("/user/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const messages = await scheduledMessageService.getUserScheduledMessages(userId);
        res.status(200).json({success: true, data: messages});
    } catch (error: any) {
        res.status(400).json({error: error.message});
    }
});

/*
Get a specific scheduled message by ID
GET http://localhost:3000/api/scheduledMessage/:messageId
*/
router.get("/:messageId", async (req, res) => {
    try {
        const messageId = Number(req.params.messageId);
        const message = await scheduledMessageService.getScheduledMessage(messageId);
        res.status(200).json({success: true, data: message});
    } catch (error: any) {
        res.status(404).json({error: error.message});
    }
});

/*
Update a scheduled message
PUT http://localhost:3000/api/scheduledMessage/:messageId
Headers: Content-Type: application/json

Body (raw JSON) - Color trigger (Red Day or Yellow Day):
{
  "text": "Updated reminder text",
  "trigger": "Yellow Day"
}

Body (raw JSON) - Date trigger:
{
  "text": "Updated reminder text",
  "trigger": "Date",
  "duedate": "2026-01-20T14:00:00Z"
}
*/
router.put("/:messageId", async (req, res) => {
    try {
        const messageId = Number(req.params.messageId);
        const text = req.body?.text;
        const trigger = req.body?.trigger as Trigger;
        const duedate = req.body?.duedate ? new Date(req.body.duedate) : null;

        if (!text || !trigger) {
            return res.status(400).json({
                error: "Missing required fields: text, trigger"
            });
        }

        await scheduledMessageService.updateScheduledMessage(messageId, text, trigger, duedate);
        res.status(200).json({success: true, message: "Scheduled message updated"});
    } catch (error: any) {
        res.status(400).json({error: error.message});
    }
});

/*
Delete a scheduled message
DELETE http://localhost:3000/api/scheduledMessage/:messageId
*/
router.delete("/:messageId", async (req, res) => {
    try {
        const messageId = Number(req.params.messageId);
        await scheduledMessageService.deleteScheduledMessage(messageId);
        res.status(200).json({success: true, message: "Scheduled message deleted"});
    } catch (error: any) {
        res.status(400).json({error: error.message});
    }
});

export default router;