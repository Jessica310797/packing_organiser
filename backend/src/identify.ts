import Anthropic from "@anthropic-ai/sdk";
import { IdentifiedItem, IdentifiedItemSchema, IdentifyRequest, ITEM_CATEGORIES } from "./types.js";

const anthropic = new Anthropic();

const RECORD_ITEM_TOOL: Anthropic.Tool = {
  name: "record_item",
  description: "Record the identified packing item as structured data.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Short, specific name of the item, e.g. 'Blue rain jacket'",
      },
      category: {
        type: "string",
        enum: [...ITEM_CATEGORIES],
      },
      description: {
        type: "string",
        description: "One sentence describing distinguishing details (color, material, brand if visible)",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
    },
    required: ["name", "category", "description", "confidence"],
  },
};

export class IdentifyError extends Error {}

export async function identifyItem(request: IdentifyRequest): Promise<IdentifiedItem> {
  const { text, imageBase64, imageMediaType } = request;

  const content: Anthropic.MessageParam["content"] = [];

  if (imageBase64 && imageMediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    });
  }

  content.push({
    type: "text",
    text: text
      ? `Identify this packing item. The user described it as: "${text}". ${
          imageBase64 ? "Use the photo to confirm and add detail." : ""
        } Call record_item with your best structured guess.`
      : "Identify the packing item shown in this photo and call record_item with your best structured guess.",
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    tools: [RECORD_ITEM_TOOL],
    tool_choice: { type: "tool", name: "record_item" },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "record_item"
  );

  if (!toolUse) {
    throw new IdentifyError("Model did not return a structured item");
  }

  const parsed = IdentifiedItemSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new IdentifyError(`Model returned an invalid item: ${parsed.error.message}`);
  }

  return parsed.data;
}
