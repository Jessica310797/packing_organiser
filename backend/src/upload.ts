import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import type { SupportedImageMediaType } from "./vision/visionAnalyzer.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const SUPPORTED_MEDIA_TYPES: SupportedImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Shared multer instance for any route that accepts a single photo upload (field name "photo"). */
export const photoUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (SUPPORTED_MEDIA_TYPES.includes(file.mimetype as SupportedImageMediaType)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }
  },
});
