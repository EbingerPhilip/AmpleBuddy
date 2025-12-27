import express = require("express");
import path = require("path");
import dotenv = require("dotenv");
import cors =require("cors");
const db = require("./config/db");


const app = express();
dotenv.config();
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
// this is for testing and to teach you guys how to use the database connection
app.get("/test/login", async(_req, res) => {
const sql = 'Select * from users where userid = ?'; //regular sql syntax, but all variables are Replaced wit ? this is safer 
const adminuser = await db.execute(sql,[1])         // include an Array of all variables in the order as they appear in the statment 
res.status(200).json(adminuser[0])                  //the execute function allway returns an Array, your values are always [0] do not send metadata
})



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend running at http://localhost:4000`);
});