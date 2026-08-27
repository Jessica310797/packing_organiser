import { Router } from "express";
import { z } from "zod";
import * as repo from "../wardrobe/repository.js";
import { requireAuth } from "../auth/middleware.js";

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

export function createWardrobeRouter(): Router {
  const router = Router();

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

  return router;
}
