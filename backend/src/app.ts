import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InventoryService } from "./inventory/inventoryService.js";
import { createTripsRouter } from "./routes/trips.js";
import type { VisionAnalyzer } from "./vision/visionAnalyzer.js";
import type { LLMMatcher } from "./inventory/reconciler.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp(visionAnalyzer: VisionAnalyzer, llmMatcher: LLMMatcher): Express {
  const service = new InventoryService(visionAnalyzer, llmMatcher);

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(createTripsRouter(service));
  app.use(express.static(PUBLIC_DIR));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
