import express, { type Express } from "express";
import { InventoryService } from "./inventory/inventoryService.js";
import { createTripsRouter } from "./routes/trips.js";
import type { VisionAnalyzer } from "./vision/visionAnalyzer.js";
import type { LLMMatcher } from "./inventory/reconciler.js";

export function createApp(visionAnalyzer: VisionAnalyzer, llmMatcher: LLMMatcher): Express {
  const service = new InventoryService(visionAnalyzer, llmMatcher);

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(createTripsRouter(service));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
