import multer from "multer";
import path from "path";
import dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

var maxFileSize = Number(process.env.MaxFileSizeMB);
if (!maxFileSize) {
    throw Error('failed to read .env file')
}
maxFileSize = maxFileSize * 1024 * 1024

const uploadDir = path.join(
    __dirname,
    "../public/documents"
);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir); // make sure this folder exists
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
        );
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: maxFileSize
    },
});