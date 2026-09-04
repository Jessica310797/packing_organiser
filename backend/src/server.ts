import { createApp } from "./app.js";
import { ClaudeVisionAnalyzer } from "./vision/visionAnalyzer.js";
import { ClaudeLLMMatcher } from "./inventory/llmMatcher.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "Warning: ANTHROPIC_API_KEY is not set. Photo analysis endpoints will fail until it is configured.",
  );
}

const app = createApp(new ClaudeVisionAnalyzer(), new ClaudeLLMMatcher());

app.listen(PORT, () => {
  console.log(`packing-organiser backend listening on http://localhost:${PORT}`);
});
