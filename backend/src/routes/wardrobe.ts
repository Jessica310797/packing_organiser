import { Router } from "express";
import fs from "node:fs";
import { z } from "zod";
import * as repo from "../wardrobe/repository.js";
import { WardrobeService } from "../wardrobe/wardrobeService.js";
import { requireAuth } from "../auth/middleware.js";
import { photoUpload } from "../upload.js";
import type { SupportedImageMediaType, VisionAnalyzer } from "../vision/visionAnalyzer.js";

const addItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().positive().default(1),
});

const editItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().positive().optional(),
});

export function createWardrobeRouter(visionAnalyzer: VisionAnalyzer): Router {
  const router = Router();
  const wardrobeService = new WardrobeService(visionAnalyzer);

  router.get("/wardrobe", requireAuth, (req, res) => {
    res.json(repo.listActiveWardrobeItems(req.userId as string));
  });

  router.post("/wardrobe", requireAuth, (req, res) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = repo.addWardrobeItem(req.userId as string, {
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      quantity: parsed.data.quantity,
    });
    res.status(201).json(item);
  });

  router.patch("/wardrobe/:itemId", requireAuth, (req, res) => {
    const parsed = editItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = repo.updateWardrobeItem(req.params.itemId as string, req.userId as string, parsed.data);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  });

  router.delete("/wardrobe/:itemId", requireAuth, (req, res) => {
    repo.removeWardrobeItem(req.params.itemId as string, req.userId as string);
    res.status(204).send();
  });

  router.post("/wardrobe/photos", requireAuth, photoUpload.single("photo"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Missing photo file (field name 'photo')" });

    try {
      const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
      const result = await wardrobeService.ingestPhoto(req.userId as string, {
        imageBase64,
        mediaType: req.file.mimetype as SupportedImageMediaType,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(502).json({ error: `Photo analysis failed: ${(err as Error).message}` });
    } finally {
      // Unlike trip photos, wardrobe photos are transient -- used only for
      // detection, never stored/served -- so clean up the temp upload.
      fs.unlink(req.file.path, () => {});
    }
  });

  return router;
}
