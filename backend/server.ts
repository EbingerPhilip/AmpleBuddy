import express = require("express");
import path = require("path");
import cors =require("cors");

const app = express();
app.use(cors());          // <-- ALLOWS FRONTEND ACCESS
app.use(express.json());
const PORT = 3000;

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/test/user", (_req, res) => {
  const TestUser = {
    username: "max.musterman@gmail.com",
    nickname: "max",
    userid: 9999,
    Contacts: [
      {nickname: "philip", userid : 1, username : "blablabla"},
      {nickname: "marvin", userid : 2, username : "blablabla"},
      {nickname: "martin", userid : 3, username : "blablabla"},
    ],
  }

res.status(200).json(TestUser)
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend running at http://localhost:4000`);
});