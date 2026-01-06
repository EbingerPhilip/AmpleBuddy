import { Router } from "express";
import { userService } from "../service/userService";
import { EDailyMood } from "../modules/user";
import multer from "multer"
import path from "path"
import sharp from "sharp";

const upload = multer({ storage: multer.memoryStorage() });
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


/*
Get user nickname by user ID
GET http://localhost:3000/api/users/findUser/:userId

Request:
userId: User of which the nickname is requested.

Response:
{
    "succsess": true,
    "userNickname": "Maria Garcia"
}
 */
router.get("/findUser/:userId", async (req, res)=>{
  try {
    const userID = Number(req.params.userId);
    if(userID == 1 || userID == 2) res.status(400).json({error: "Invalid User"});
    const user = await userService.getUserById(userID);
    const userNickname = user.nicknames;

    if (!userNickname) return res.status(404).json({error: "User not found"})
    res.status(200).json({succsess: true, userNickname: userNickname});
  } catch (err: any) {
    res.status(400).json({error: err.message});
  }
});


/*
Delete user account completely:
1. Decouple from all chats (replace with [deleted] user (userId = 1) or delete chats without remaining members)
2. Delete preferences
3. Delete user from users table
DELETE http://localhost:3000/api/users/:userId/delete
*/
router.delete("/:userId/delete", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    // protect the [deleted] user from deletion, as this is an essential part of the system
    if (userId === 1) {
      return res.status(400).json({ error: "Cannot delete [deleted] user (userId = 1)" });
    }

    await userService.deleteUserAccount(userId);
    res.status(200).json({ success: true, message: "User account deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*
Log current mood and attempt buddy match
POST http://localhost:3000/api/users/:userId/mood
Headers: Content-Type: application/json
Body:
{ "mood": "green" } // green | red | yellow | gray
*/
router.post("/:userId/mood", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { mood } = req.body as { mood: EDailyMood };
    if (!mood) return res.status(400).json({ error: "Missing mood" });

    const result = await userService.logDailyMood(userId, mood);
    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*
Upload Profile Picture
POST http://localhost:3000/api/users/profile-pics
Headers: Content-Type: application/json
Body/form-data:
key:            Value:
userId          4
profile-pics    image.png 
*/
router.post("/profile-pics", upload.single("profile-pics"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const userId = req.body.userId;
  const folderpath =  path.join(__dirname, "../../backend/public/profile-pics");
  const url = path.join(folderpath, `${userId}.png`);

  await sharp(req.file.buffer).png().toFile(url);

  res.json({ message : `URL: http://localhost:3000/profile-pics/${userId}.png` }); // frontend can use this URL directly
},);



export default router;