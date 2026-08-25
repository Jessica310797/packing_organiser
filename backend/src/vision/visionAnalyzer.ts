import Anthropic from "@anthropic-ai/sdk";
import type { DetectedItem } from "../types.js";

const MODEL = process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-5";

export type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface PhotoInput {
  imageBase64: string;
  mediaType: SupportedImageMediaType;
}

export interface VisionAnalyzer {
  analyzePhoto(input: PhotoInput): Promise<DetectedItem[]>;
}

const REPORT_ITEMS_TOOL_NAME = "report_detected_items";

const REPORT_ITEMS_TOOL: Anthropic.Tool = {
  name: REPORT_ITEMS_TOOL_NAME,
  description: "Report every distinct physical item visible in the packing photo.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Short, specific name a person would use, e.g. 'blue t-shirt', 'phone charger'.",
            },
            category: {
              type: "string",
              description:
                "One of: clothing, footwear, toiletries, electronics, documents, accessories, medication, other.",
            },
            quantity: {
              type: "integer",
              minimum: 1,
              description: "How many of this exact item are visible together in this photo.",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "How confident you are in this identification.",
            },
          },
          required: ["name", "category", "quantity", "confidence"],
        },
      },
    },
    required: ["items"],
  },
};

const SYSTEM_PROMPT =
  "You are an assistant that inventories the contents of a suitcase from a photo taken while someone packs. " +
  "Identify every distinct physical item that would be packed for a trip. Ignore the suitcase/bag itself, " +
  "hands, background, and furniture. If the same item type appears multiple times together in this single " +
  "photo (e.g. 3 identical pairs of socks), report it once with the correct quantity rather than repeating it.";

/** Calls Claude's vision + forced tool-use to turn one packing photo into structured item detections. */
export class ClaudeVisionAnalyzer implements VisionAnalyzer {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async analyzePhoto({ imageBase64, mediaType }: PhotoInput): Promise<DetectedItem[]> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [REPORT_ITEMS_TOOL],
      tool_choice: { type: "tool", name: REPORT_ITEMS_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: "Identify the packable items visible in this photo.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return [];

    return parseDetectedItems(toolUse.input);
  }
}

function parseDetectedItems(rawInput: unknown): DetectedItem[] {
  if (typeof rawInput !== "object" || rawInput === null) return [];
  const items = (rawInput as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const detected: DetectedItem[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (name.length === 0) continue;

    const category = typeof record.category === "string" && record.category.trim().length > 0
      ? record.category.trim()
      : null;
    const quantity =
      typeof record.quantity === "number" && Number.isFinite(record.quantity) && record.quantity > 0
        ? Math.round(record.quantity)
        : 1;
    const confidence =
      typeof record.confidence === "number" && Number.isFinite(record.confidence)
        ? Math.min(1, Math.max(0, record.confidence))
        : 0.5;

    detected.push({ name, category, quantity, confidence });
  }
  return detected;
}
