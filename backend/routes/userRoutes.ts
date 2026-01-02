import { Router } from "express";
import { userService } from "../service/userService";

const router = Router();

/*
Create a new user
POST http://localhost:3000/api/users/new
Headers: Content-Type: application/json
Body (raw JSON):
{
  "username": "alice@example.com",
  "password": "secret123",
  "nicknames": "alice",
  "dailyMood": "gray",        // optional: green | orange | red | gray
  "dateOfBirth": "1990-05-10",// optional (YYYY-MM-DD)
  "theme": "light",           // optional: light | dark | moody
  "pronouns": "she/her",      // optional: he/him | she/her | they/them | hidden
  "instantBuddy": false       // optional
}
*/
router.post("/new", async (req, res) => {
  try {
    const { username, password, nicknames, dailyMood, dateOfBirth, theme, pronouns, instantBuddy } = req.body;
    if (!username || !password || !nicknames) {
      return res.status(400).json({ error: "Missing required fields: username, password, nicknames" });
    }
    const id = await userService.createUser({
      username,
      password,
      nicknames,
      dailyMood,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      theme,
      pronouns,
      instantBuddy,
    });
    res.status(201).json({ success: true, userId: id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*
Get user by ID
GET http://localhost:3000/api/users/:userId
*/
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await userService.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*
Update user (partial)
PUT http://localhost:3000/api/users/:userId
Headers: Content-Type: application/json
Body (raw JSON - all fields optional):
{
  "username": "alice2@example.com",
  "password": "newpass",
  "nicknames": "ally",
  "dailyMood": "green",
  "dateOfBirth": "1991-01-01",
  "theme": "dark",
  "pronouns": "they/them",
  "instantBuddy": true
}
*/
router.put("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const updates = req.body;
    await userService.updateUser(userId, updates);
    res.status(200).json({ success: true, message: "User updated" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;