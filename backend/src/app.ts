import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InventoryService } from "./inventory/inventoryService.js";
import { createTripsRouter } from "./routes/trips.js";
import { createWardrobeRouter } from "./routes/wardrobe.js";
import { createPackingListsRouter } from "./routes/packingLists.js";
import { createAuthRouter } from "./routes/auth.js";
import type { VisionAnalyzer } from "./vision/visionAnalyzer.js";
import type { LLMMatcher } from "./inventory/reconciler.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp(visionAnalyzer: VisionAnalyzer, llmMatcher: LLMMatcher): Express {
  const service = new InventoryService(visionAnalyzer, llmMatcher);

  const app = express();
  // Open CORS: this is a local-only MVP with no auth/sensitive data, and the
  // mobile app (Expo web, or a device on another origin) needs to call this
  // API cross-origin.
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(createAuthRouter());
  // requireAuth is applied per-route inside these routers, not blanket here --
  // the photo-file-serving route is deliberately left unauthenticated (see
  // routes/trips.ts) since <Image> can't attach an Authorization header
  // cross-platform (React Native web renders it as a plain <img>).
  app.use(createTripsRouter(service));
  app.use(createWardrobeRouter(visionAnalyzer));
  app.use(createPackingListsRouter());
  app.use(express.static(PUBLIC_DIR));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
