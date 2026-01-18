import {Router} from "express";
import {userService} from "../service/userService";
import {EDailyMood} from "../modules/user";
import {signUserToken} from "../modules/jwt";
import {requireAuth, AuthedRequest} from "../modules/authMiddleware";
import fs from "fs";
import {preferencesService} from "../service/preferencesService";
import {moodHistoryRepository} from "../repository/moodHistoryRepository";
import multer from "multer"
import path from "path"
import sharp from "sharp";
import {hashPassword, verifyPassword} from "../config/encryption";
import {chatRepository} from "../repository/chatRepository";
import {messageRepository} from "../repository/messageRepository";

const upload = multer({storage: multer.memoryStorage()});
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
  "dailyMood": "grey",        // optional: green | orange | red | grey
  "dateOfBirth": "1990-05-10",// optional (YYYY-MM-DD)
  "theme": "light",           // optional: light | dark | colourblind
  "pronouns": "she/her",      // optional: he/him | she/her | they/them | hidden
  "instantBuddy": false       // optional
}
*/
router.post("/new", async (req, res) => {
    try {
        console.log("[REGISTER] body =", req.body);
        let {username, password, nicknames, dailyMood, dateOfBirth, theme, pronouns, instantBuddy} = req.body ?? {};

        // Basic field checks
        if (typeof username !== "string" || typeof password !== "string" || typeof nicknames !== "string") {
            return res.status(400).json({error: "Missing required fields: username, password, nicknames"});
        }
        username = username.trim();
        nicknames = nicknames.trim();
        password = await hashPassword(password);

        if (!username || !password || !nicknames) {
            return res.status(400).json({error: "Missing required fields: username, password, nicknames"});
        }

        // match DB schema
        dailyMood = typeof dailyMood === "string" ? dailyMood : "grey";
        theme = typeof theme === "string" ? theme : "light";
        pronouns = typeof pronouns === "string" ? pronouns : "hidden";

        // dateOfBirth can be null
        dateOfBirth = typeof dateOfBirth === "string" ? dateOfBirth : null;

        const instantBuddyRaw = instantBuddy;

        // Default to TRUE if not provided
        if (instantBuddyRaw === undefined || instantBuddyRaw === null) {
            instantBuddy = 1;
        } else {
            instantBuddy = instantBuddyRaw === true || instantBuddyRaw === 1 || instantBuddyRaw === "1" ? 1 : 0;
        }

        // Explicit enum validation
        const allowedMoods = new Set(["green", "yellow", "red", "grey"]);
        const allowedThemes = new Set(["light", "dark", "colourblind"]);
        // FOR SOME FUCKASS REASON, PHILIP MADE THE COLOUR-BLIND OPTION IN DB BE CALLED moody
        const allowedPronouns = new Set(["he/him", "she/her", "they/them", "hidden"]);

        if (!allowedMoods.has(dailyMood)) {
            return res.status(400).json({error: "Invalid dailyMood. Allowed: green, yellow, red, grey"});
        }
        if (!allowedThemes.has(theme)) {
            return res.status(400).json({error: "Invalid theme. Allowed: light, dark, colourblind"});
        }
        if (pronouns == "prefer not to say") {
            pronouns = "hidden";
        }
        if (!allowedPronouns.has(pronouns)) {
            return res.status(400).json({error: "Invalid pronouns. Allowed: he/him, she/her, they/them, hidden"});
        }

        // Create user
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

        return res.status(201).json({success: true, userId: id});
    } catch (err: any) {
        console.error("[REGISTER] error =", err);

        const message = err?.sqlMessage || err?.message || "Registration failed (unknown error)";
        return res.status(400).json({error: message});
    }
});


/*
Login
POST https://localhost:3000/api/user/login
Headers: Content-Type: application/json
Body (raw JSON):
{
  "username": "buddy@example.com",
  "password": "test123"
}
Response:
{
  "success": true,
  "userId": 123,
  "token": "<jwt>"
}
*/
router.post("/login", async (req, res) => {
    try {
        const {username, password} = req.body ?? {};
        if (typeof username !== "string" || typeof password !== "string") {
            return res.status(400).json({error: "Missing or invalid fields: username, password"});
        }

        const usernameNorm = username.trim();
        if (!usernameNorm) {
            return res.status(400).json({error: "Username mustn't be empty"});
        }

        const user = await userService.getUserByUsername(usernameNorm);
        if (!user) {
            return res.status(401).json({error: "Invalid credentials"});
        }

        // Note for self: DB currently saves passwords as plaintext, change this if we change that
        const verify: boolean = await verifyPassword(user.password, password);
        if (!verify) {
            return res.status(401).json({error: "Invalid credentials"});
        }

        const token = signUserToken(Number(user.userid));
        return res.status(200).json({success: true, userId: Number(user.userid), token});
    } catch (err: any) {
        return res.status(400).json({error: err.message});
    }
});

router.get("/me", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const user = await userService.getUserById(userId);
        if (!user) return res.status(404).json({error: "User not found"});

        const prefs = await preferencesService.getPreferences(userId).catch(() => null);
        const pic = path.join(__dirname, "../../backend/public/profile-pics", `${userId}.png`);
        const hasProfilePic = fs.existsSync(pic);
        const {password, ...safeUser} = user;

        res.status(200).json({
            success: true,
            data: {
                ...safeUser,
                hasProfilePic,
                profilePicUrl: hasProfilePic ? `/profile-pics/${userId}.png` : null,
                preferences: prefs ?? null,
                moodHistory: [] // not implemented in DB yet
            }
        });
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

// Download a TXT export of all messages in chats the current user is currently a participant in,
// grouped by chat (including participants).
// GET /api/user/chat-logs
router.get("/chat-logs", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const me = await userService.getUserById(userId);

        const chatIds = await chatRepository.getUserChatIds(userId);

        const now = new Date();
        const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `amplebuddy_chat_logs_${stamp}.txt`;

        const lines: string[] = [];
        lines.push("AmpleBuddy chat logs");
        lines.push(`Generated: ${now.toISOString()}`);
        lines.push(`Requested by: ${me?.nicknames ?? "(unknown)"} (userid=${userId})`);
        lines.push("");

        for (const chatId of chatIds) {
            const chatData = await chatRepository.getChatById(chatId);
            const members = await chatRepository.getChatMembers(chatId);

            const memberInfos = await Promise.all(
                members.map(async (id) => {
                    const u = await userService.getUserById(id);
                    const nick = u?.nicknames ?? (id === 1 ? "[deleted]" : `[user ${id}]`);
                    return {id, nick};
                })
            );

            const isGroup = chatData?.group === 1 || chatData?.group === true;
            const title = isGroup
                ? (chatData?.groupname ? `Group: ${chatData.groupname}` : `Group chat ${chatId}`)
                : (() => {
                    const other = memberInfos.find((m) => m.id !== userId);
                    return other ? `Direct chat with ${other.nick}` : `Direct chat ${chatId}`;
                })();

            lines.push("========================================");
            lines.push(`Chat ${chatId} — ${title}`);
            lines.push(`Participants: ${memberInfos.map((m) => `${m.nick} (userid=${m.id})`).join(", ")}`);
            lines.push("----------------------------------------");

            const allMessages = await messageRepository.getMessagesByChatId(chatId);

            if (!allMessages || allMessages.length === 0) {
                lines.push("(No messages in this chat.)");
                lines.push("");
                continue;
            }

            for (const m of allMessages) {
                const ts = m.timeSent ? new Date(m.timeSent).toISOString() : "(unknown time)";
                const senderId = Number(m.sender);
                const senderNick =
                    (m.nicknames ?? "").toString().trim() ||
                    memberInfos.find((x) => x.id === senderId)?.nick ||
                    (senderId === 1 ? "[deleted]" : `[user ${senderId}]`);

                const text = (m.text ?? "").toString();
                const link = m.link ? ` [file: ${m.link}]` : "";
                lines.push(`[${ts}] ${senderNick} (userid=${senderId}): ${text}${link}`.trim());
            }

            lines.push("");
        }

        const content = lines.join("\n");

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(content);
    } catch (err: any) {
        console.error("[CHAT LOGS] failed:", err);
        res.status(400).json({error: err?.sqlMessage ?? err?.message ?? "Failed to retrieve chat logs"});
    }
});

router.post("/profile-pics", requireAuth, upload.single("profile-pics"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    const userId = (req as AuthedRequest).userId;
    const folderpath = path.join(__dirname, "../../backend/public/profile-pics");
    const url = path.join(folderpath, `${userId}.png`);

    await sharp(req.file.buffer).png().toFile(url);

    res.json({success: true, url: `/profile-pics/${userId}.png`});
});

router.delete("/profile-pics", requireAuth, async (req, res) => {
    const userId = (req as AuthedRequest).userId;
    const abs = path.join(__dirname, "../../backend/public/profile-pics", `${userId}.png`);

    if (fs.existsSync(abs)) fs.unlinkSync(abs);

    res.json({success: true});
});

// Delete *own* account (Profile page)
// POST /api/user/delete-account
// Body: { "password": "<current password>" }
router.post("/delete-account", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const {password} = req.body ?? {};

        if (typeof password !== "string" || !password.trim()) {
            return res.status(400).json({error: "Password is required"});
        }

        await userService.deleteOwnAccount(userId, password);

        // Best-effort: remove profile picture file
        const abs = path.join(__dirname, "../../backend/public/profile-pics", `${userId}.png`);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);

        return res.status(200).json({success: true});
    } catch (err: any) {
        return res.status(400).json({error: err.message});
    }
});

/*
Log current mood (JWT user) and attempt buddy match
POST /api/users/mood
Headers: Authorization: Bearer <token>
Body: { "mood": "green" } // green | red | yellow | grey
*/
router.post("/mood", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const {mood} = req.body as { mood: EDailyMood };
        if (!mood) return res.status(400).json({error: "Missing mood"});

        const result = await userService.logDailyMood(userId, mood);
        res.status(200).json({success: true, ...result});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});


router.get("/moodhistory", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const rows = await moodHistoryRepository.getMoodHistory(userId);
        const data = rows.map((r: any) => ({
            ...r,
            date: typeof r.date === "string" ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
        }));
        res.status(200).json({success: true, data});

    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

/*
Get user by ID
GET http://localhost:3000/api/users/:userId
*/
router.get("/findUserId/:userId", async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const user = await userService.getUserById(userId);
        if (!user) return res.status(404).json({error: "User not found"});
        res.status(200).json({success: true, data: user});
    } catch (err: any) {
        res.status(400).json({error: err.message});
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
router.put("/edit", requireAuth, async (req, res) => {
    try {
        const userId = (req as AuthedRequest).userId;
        const existing = await userService.getUserById(userId);
        if (!existing) return res.status(404).json({error: "User not found"});
        const {nicknames, pronouns, dateOfBirth, dobHidden, instantBuddy, theme} = req.body ?? {};
        const updates: any = {};

        if (typeof nicknames === "string" && nicknames.trim()) updates.nicknames = nicknames.trim();
        if (typeof pronouns === "string") {
            updates.pronouns = pronouns === "prefer not to say" ? "hidden" : pronouns;
        }
        if (typeof instantBuddy === "boolean") updates.instantBuddy = instantBuddy;
        if (typeof theme === "string") {
            const t = theme.trim().toLowerCase();
            if (t === "light" || t === "dark" || t === "colourblind") {
                updates.theme = t;
            }
        }

        // Only allow setting DOB if it was never set before
        if ((existing.dateOfBirth === null || existing.dateOfBirth === undefined) && typeof dateOfBirth === "string") {
            updates.dateOfBirth = new Date(dateOfBirth);
        }
        if (typeof dobHidden === "boolean") updates.dobHidden = dobHidden;

        await userService.updateUser(userId, updates);
        res.status(200).json({success: true, message: "Profile updated"});
    } catch (err: any) {
        res.status(400).json({error: err.message});
    }
});

export default router;