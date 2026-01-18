import {Router} from "express";
import {preferencesService} from "../service/preferencesService";

const router = Router();

/*
Create preferences for a user
POST http://localhost:3000/api/preferences/new
Headers: Content-Type: application/json
Body (raw JSON):
{
  "userId": 1,
  "gender": "male",        // male | female | other | hidden (optional)
  "minGreen": 3,           // optional
  "age": 26                // optional; if null, will store null
}
*/
router.post("/new", async (req, res) => {
    try {
        const {userId, gender = null, minGreen = null, age = null, ageMin = null, ageMax = null} = req.body;
        if (!userId) return res.status(400).json({error: "Missing required field: userId"});
        await preferencesService.createPreferences(Number(userId), gender, minGreen, age, ageMin, ageMax);
        res.status(201).json({success: true});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

/*
Get preferences for a user
GET http://localhost:3000/api/preferences/:userId
*/
router.get("/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const prefs = await preferencesService.getPreferences(userId);
        if (!prefs) return res.status(404).json({error: "Preferences not found"});
        res.status(200).json({success: true, data: prefs});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

/*
Update preferences for a user
PUT http://localhost:3000/api/preferences/:userId
Headers: Content-Type: application/json
Body (raw JSON):
{
  "gender": "female",      // optional
  "minGreen": 2,           // optional
  "age": 25                // optional; if null, will store null
}
*/
router.put("/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const {gender = null, minGreen = null, age = null, ageMin = null, ageMax = null} = req.body;
        await preferencesService.updatePreferences(userId, gender, minGreen, age, ageMin, ageMax);
        res.status(200).json({success: true, message: "Preferences updated"});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

export default router;