import multer from "multer";
import path from "path";

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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});