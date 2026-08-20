import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { identifyItem, IdentifyError } from "./identify.js";
import { IdentifyRequestSchema } from "./types.js";

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Accepts either JSON { text, imageBase64, imageMediaType } or multipart/form-data
// with a "text" field and an "image" file field.
app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    const body = req.file
      ? {
          text: typeof req.body.text === "string" && req.body.text.length > 0 ? req.body.text : undefined,
          imageBase64: req.file.buffer.toString("base64"),
          imageMediaType: req.file.mimetype,
        }
      : req.body;

    const parsed = IdentifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (!parsed.data.text && !parsed.data.imageBase64) {
      res.status(400).json({ error: "Provide at least a text description or an image" });
      return;
    }

    const item = await identifyItem(parsed.data);
    res.json({ item });
  } catch (err) {
    if (err instanceof IdentifyError) {
      res.status(422).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to identify item" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Packing organiser backend listening on port ${port}`);
});
