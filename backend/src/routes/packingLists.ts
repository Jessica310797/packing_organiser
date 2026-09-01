import { Router } from "express";
import { z } from "zod";
import * as repo from "../packingLists/repository.js";
import { findStarterItems } from "../recommendations/packingTemplates.js";
import { requireAuth } from "../auth/middleware.js";
import type { PackingListCategory } from "../types.js";

const CATEGORIES: [PackingListCategory, ...PackingListCategory[]] = ["travel_type", "destination", "activity"];

const createListSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(1),
});

const renameListSchema = z.object({
  name: z.string().trim().min(1),
});

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

export function createPackingListsRouter(): Router {
  const router = Router();

  router.get("/packing-lists", requireAuth, (req, res) => {
    res.json(repo.listPackingLists(req.userId as string));
  });

  router.post("/packing-lists", requireAuth, (req, res) => {
    const parsed = createListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const userId = req.userId as string;
    const list = repo.createPackingList(userId, parsed.data.category, parsed.data.name);

    // Pre-fill from the existing rule-based templates, when the list's name
    // matches a known one (e.g. "Hiking", "Plane") -- a custom name just
    // starts empty rather than fabricating items with no basis.
    for (const template of findStarterItems(parsed.data.category, parsed.data.name)) {
      repo.addPackingListItem(list.id, {
        name: template.name,
        category: template.category,
        // Templates that scale by trip duration have no trip here to scale
        // against -- fall back to a single starter unit, same as any other
        // quantity the user can freely adjust afterwards.
        quantity: template.quantity ?? 1,
      });
    }

    res.status(201).json({ list, items: repo.listPackingListItems(list.id) });
  });

  router.get("/packing-lists/:listId", requireAuth, (req, res) => {
    const list = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!list) return res.status(404).json({ error: "List not found" });
    res.json({ list, items: repo.listPackingListItems(list.id) });
  });

  router.patch("/packing-lists/:listId", requireAuth, (req, res) => {
    const parsed = renameListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const existing = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!existing) return res.status(404).json({ error: "List not found" });
    const list = repo.renamePackingList(existing.id, req.userId as string, parsed.data.name);
    res.json(list);
  });

  router.delete("/packing-lists/:listId", requireAuth, (req, res) => {
    const existing = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!existing) return res.status(404).json({ error: "List not found" });
    repo.deletePackingList(existing.id, req.userId as string);
    res.status(204).send();
  });

  router.post("/packing-lists/:listId/items", requireAuth, (req, res) => {
    const list = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!list) return res.status(404).json({ error: "List not found" });
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = repo.addPackingListItem(list.id, {
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      quantity: parsed.data.quantity,
    });
    res.status(201).json(item);
  });

  router.patch("/packing-lists/:listId/items/:itemId", requireAuth, (req, res) => {
    const list = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!list) return res.status(404).json({ error: "List not found" });
    const item = repo.getPackingListItem(req.params.itemId as string);
    if (!item || item.listId !== list.id) return res.status(404).json({ error: "Item not found" });

    const parsed = editItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = repo.updatePackingListItem(item.id, parsed.data);
    res.json(updated);
  });

  router.delete("/packing-lists/:listId/items/:itemId", requireAuth, (req, res) => {
    const list = repo.getPackingList(req.params.listId as string, req.userId as string);
    if (!list) return res.status(404).json({ error: "List not found" });
    const item = repo.getPackingListItem(req.params.itemId as string);
    if (!item || item.listId !== list.id) return res.status(404).json({ error: "Item not found" });

    repo.removePackingListItem(item.id);
    res.status(204).send();
  });

  return router;
}
