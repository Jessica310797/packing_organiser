import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { InventoryService } from "../inventory/inventoryService.js";
import type { SupportedImageMediaType } from "../vision/visionAnalyzer.js";
import { getTripWeather } from "../weather/weatherService.js";
import { getDestinationPhoto } from "../photos/destinationPhotoService.js";
import { getPackingRecommendations } from "../recommendations/recommendationService.js";
import { requireAuth } from "../auth/middleware.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SUPPORTED_MEDIA_TYPES: SupportedImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const upload = multer({
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

const createTripSchema = z.object({
  destination: z.string().trim().min(1),
  purpose: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  durationDays: z.number().int().positive(),
  activities: z.array(z.string().trim().min(1)).default([]),
  packingTarget: z.number().int().positive().nullable().optional(),
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

const resolveReviewSchema = z
  .object({
    action: z.enum(["confirm_match", "confirm_new", "discard"]),
    itemId: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.action !== "confirm_match" || !!body.itemId, {
    message: "itemId is required when action is 'confirm_match'",
    path: ["itemId"],
  });

export function createTripsRouter(service: InventoryService): Router {
  const router = Router();

  router.post("/trips", requireAuth, (req, res) => {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const trip = service.createTrip(req.userId as string, parsed.data);
    res.status(201).json(trip);
  });

  router.get("/trips", requireAuth, (req, res) => {
    res.json(service.listTrips(req.userId as string));
  });

  router.get("/trips/:tripId", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(trip);
  });

  router.get("/trips/:tripId/inventory", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(service.getInventory(trip.id));
  });

  router.post("/trips/:tripId/inventory", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = service.addManualItem(trip.id, {
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      quantity: parsed.data.quantity,
    });
    res.status(201).json(item);
  });

  router.patch("/trips/:tripId/inventory/:itemId", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const parsed = editItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = service.editItem(trip.id, req.params.itemId as string, parsed.data);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  });

  router.delete("/trips/:tripId/inventory/:itemId", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    service.removeItem(trip.id, req.params.itemId as string);
    res.status(204).send();
  });

  router.get("/trips/:tripId/review", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(service.getPendingReview(trip.id));
  });

  router.post("/review/:candidateId/resolve", requireAuth, (req, res) => {
    const parsed = resolveReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
      const resolution =
        parsed.data.action === "confirm_match"
          ? ({ action: "confirm_match", itemId: parsed.data.itemId! } as const)
          : ({ action: parsed.data.action } as const);
      const item = service.resolveReview(req.userId as string, req.params.candidateId as string, resolution);
      res.json({ item: item ?? null });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.get("/trips/:tripId/weather", requireAuth, async (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(await getTripWeather(trip.destination, trip.startDate));
  });

  router.get("/trips/:tripId/destination-photo", requireAuth, async (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(await getDestinationPhoto(trip.destination));
  });

  router.get("/trips/:tripId/recommendations", requireAuth, async (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    const inventory = service.getInventory(trip.id);
    const weather = await getTripWeather(trip.destination, trip.startDate);
    res.json(getPackingRecommendations(trip, inventory, weather));
  });

  router.get("/trips/:tripId/photos", requireAuth, (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(service.getPhotos(trip.id));
  });

  // Deliberately NOT behind requireAuth: <Image> can't attach an
  // Authorization header cross-platform (react-native-web renders this as a
  // plain <img src>). Protected only by the photo id being an unguessable
  // UUID -- an "unlisted link" model, same as most photo-hosting URLs. Every
  // other route that reveals a photo's *existence* (list, upload, trip
  // lookup) still requires the owning user's token.
  router.get("/trips/:tripId/photos/:photoId/file", (req, res) => {
    const photo = service.getPhoto(req.params.photoId as string);
    if (!photo || photo.tripId !== req.params.tripId) {
      return res.status(404).json({ error: "Photo not found" });
    }
    res.sendFile(path.resolve(photo.filePath), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: "Photo file not found" });
    });
  });

  router.post("/trips/:tripId/photos", requireAuth, upload.single("photo"), async (req, res) => {
    const trip = service.getTrip(req.params.tripId as string, req.userId as string);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    if (!req.file) return res.status(400).json({ error: "Missing photo file (field name 'photo')" });

    try {
      const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
      const result = await service.ingestPhoto(trip.id, req.userId as string, req.file.path, {
        imageBase64,
        mediaType: req.file.mimetype as SupportedImageMediaType,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(502).json({ error: `Photo analysis failed: ${(err as Error).message}` });
    }
  });

  return router;
}
