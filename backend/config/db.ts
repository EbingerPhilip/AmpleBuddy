import dotenv = require("dotenv");
import mysql = require("mysql2");
import path = require("path");

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const user = process.env.DBuser;
const password = process.env.DBpassword;
if (!user || !password) {
    throw Error('failed to read ..env file')
}

const pool = mysql.createPool({
    host: "localhost",
    user: user,
    password: password,
    database: "amplebuddy",
    charset: "utf8mb4"
});

module.exports = pool.promise();
