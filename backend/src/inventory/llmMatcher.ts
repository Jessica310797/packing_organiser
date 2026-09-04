import Anthropic from "@anthropic-ai/sdk";
import type { DetectedItem, InventoryItem } from "../types.js";
import type { LLMMatchDecision, LLMMatcher } from "./reconciler.js";

const MODEL = process.env.ANTHROPIC_MATCH_MODEL ?? "claude-sonnet-5";

const RECONCILE_TOOL_NAME = "report_match_decisions";

const RECONCILE_TOOL: Anthropic.Tool = {
  name: RECONCILE_TOOL_NAME,
  description:
    "Report, for every newly detected item (by its index), whether it is the same physical item as " +
    "one already in the packed inventory, a genuinely new item, or too ambiguous to decide.",
  input_schema: {
    type: "object",
    properties: {
      decisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            detectionIndex: {
              type: "integer",
              description: "Index of the detected item in the input list (0-based).",
            },
            decision: {
              type: "string",
              enum: ["match", "new", "ambiguous"],
            },
            matchedItemId: {
              type: "string",
              description: "Required when decision is 'match': the id of the existing inventory item it is.",
            },
            candidateItemIds: {
              type: "array",
              items: { type: "string" },
              description:
                "When decision is 'ambiguous', the plausible existing item ids it might be (can be empty).",
            },
          },
          required: ["detectionIndex", "decision"],
        },
      },
    },
    required: ["decisions"],
  },
};

const SYSTEM_PROMPT =
  "You reconcile items freshly detected in a new packing photo against a suitcase's existing packed " +
  "inventory, so the same physical item is never counted twice as photos accumulate over a packing " +
  "session. For each detected item decide exactly one of:\n" +
  "- \"match\": it is the same physical item as one already in the existing inventory (allow for " +
  "paraphrasing, e.g. 'navy shirt' vs 'blue t-shirt', or a more/less specific description) -> give its " +
  "matchedItemId.\n" +
  "- \"new\": it is not represented in the existing inventory at all -> a genuinely new item.\n" +
  "- \"ambiguous\": you cannot confidently tell whether it's a repeat or new (e.g. it could plausibly be " +
  "any of several similar existing items, or several near-identical new items were already added this " +
  "session and you can't tell which one this is) -> list the plausible candidateItemIds, or an empty list " +
  "if it's ambiguous between being new vs. matching but you're not sure which.\n" +
  "Only ever use existing item ids that were given to you. When in doubt between match and ambiguous, " +
  "prefer ambiguous -- a human will resolve it.";

export class ClaudeLLMMatcher implements LLMMatcher {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async reconcile(
    existingItems: Pick<InventoryItem, "id" | "name" | "category">[],
    detections: DetectedItem[],
  ): Promise<LLMMatchDecision[]> {
    if (detections.length === 0) return [];

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      tools: [RECONCILE_TOOL],
      tool_choice: { type: "tool", name: RECONCILE_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: buildPrompt(existingItems, detections),
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return [];

    return parseDecisions(toolUse.input);
  }
}

function buildPrompt(
  existingItems: Pick<InventoryItem, "id" | "name" | "category">[],
  detections: DetectedItem[],
): string {
  const existingList =
    existingItems.length > 0
      ? existingItems.map((item) => `- id=${item.id} | ${item.name} (${item.category ?? "uncategorized"})`).join("\n")
      : "(none)";

  const detectionList = detections
    .map((d, i) => `- index=${i} | ${d.name} (${d.category ?? "uncategorized"}), qty ${d.quantity}`)
    .join("\n");

  return (
    `Existing packed inventory:\n${existingList}\n\n` +
    `Newly detected items in this photo:\n${detectionList}\n\n` +
    `Report a decision for every detection index.`
  );
}

function parseDecisions(rawInput: unknown): LLMMatchDecision[] {
  if (typeof rawInput !== "object" || rawInput === null) return [];
  const decisions = (rawInput as { decisions?: unknown }).decisions;
  if (!Array.isArray(decisions)) return [];

  const parsed: LLMMatchDecision[] = [];
  for (const raw of decisions) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Record<string, unknown>;

    const detectionIndex = typeof record.detectionIndex === "number" ? record.detectionIndex : null;
    if (detectionIndex === null || !Number.isInteger(detectionIndex)) continue;

    const decision = record.decision;
    if (decision !== "match" && decision !== "new" && decision !== "ambiguous") continue;

    const matchedItemId = typeof record.matchedItemId === "string" ? record.matchedItemId : undefined;
    const candidateItemIds = Array.isArray(record.candidateItemIds)
      ? record.candidateItemIds.filter((id): id is string => typeof id === "string")
      : undefined;

    parsed.push({ detectionIndex, decision, matchedItemId, candidateItemIds });
  }
  return parsed;
}
