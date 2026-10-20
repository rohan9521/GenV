import { randomUUID } from "node:crypto";
import { agentTools, toolInputs } from "../agentTools.js";
import type { AgentEvent, OllamaMessage } from "../types.js";
import {
  OllamaToolSupportError,
  streamOllamaChat,
  getOllamaErrorMessage,
} from "./ollamaClient.js";
import { waitForToolResult } from "./toolResults.js";

const systemPrompt = [
  "You create concise, polished motion graphics as SceneSpec tool calls.",
  "Plan first, then build step by step. Keep duration reasonable (usually 4-8 seconds), use readable composition, tasteful colors, and add lighting.",
  "Never output or execute code. Use tools only to mutate the JSON scene. Finish with a one-sentence summary.",
].join(" ");

const structuredOutputInstructions = [
  "Return only a JSON object with exactly these fields: tool_calls and summary.",
  "tool_calls must be an array of objects with name and arguments fields.",
  "Use only the provided scene tool names and valid arguments; never include code.",
  "Tool argument rules: set_scene requires durationInFrames (integer), background (hex color), camera {position:[x,y,z],lookAt:[x,y,z]}, objects (array), and lights (array). Each vector is exactly a 3-number array, never an object.",
  "add_object requires id, type (box|sphere|torus|text|plane), color (hex), and position ([x,y,z]); optional rotation and scale are also 3-number arrays. Do not use name or size; use id and scale. Text objects also need text.",
  "add_light requires id, type (ambient|directional|point), color (hex), intensity (number); optional position is a 3-number array. There is no spotlight type.",
  "animate_object requires id and animation {kind,startFrame,durationInFrames,easing,params}. kind is rotate|float|scale-in|orbit|fade-in|move-to; do not put animation properties at the top level.",
  "Valid tools: set_scene, add_object, update_object, remove_object, animate_object, add_light, set_camera, clear_scene.",
  "If tool results report validation errors, correct the named arguments and try again. Do not mark the scene complete while requested changes failed.",
  "When the scene is complete, return an empty tool_calls array and a one-sentence summary.",
].join(" ");

const toolReference = agentTools
  .map(
    ({ name, description, parameters }) =>
      `${name}: ${description} Arguments schema: ${JSON.stringify(parameters)}`,
  )
  .join("\n");

function describeValidationError(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

function normalizeToolInput(name: string, input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const normalized = { ...input } as Record<string, unknown>;
  const animation =
    name === "animate_object"
      ? normalized.animation
      : name === "add_object"
        ? normalized.animation
        : undefined;

  if (!animation || typeof animation !== "object" || Array.isArray(animation)) {
    return normalized;
  }

  const normalizedAnimation = { ...animation } as Record<string, unknown>;
  if (typeof normalizedAnimation.easing === "string") {
    const easingAliases: Record<string, string> = {
      easeIn: "ease-in",
      easeOut: "ease-out",
      easeInOut: "ease-in-out",
    };
    normalizedAnimation.easing =
      easingAliases[normalizedAnimation.easing] ?? normalizedAnimation.easing;
  }
  normalized.animation = normalizedAnimation;
  return normalized;
}

export async function runAgent(prompt: string, emit: AgentEvent) {
  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];
  let callCount = 0;
  let mode: "native" | "structured" = "native";

  try {
    for (let turn = 0; turn < 4; turn++) {
      let response;
      try {
        response = await streamOllamaChat(messages, emit, mode);
      } catch (error) {
        if (
          !(error instanceof OllamaToolSupportError) ||
          mode === "structured"
        ) {
          throw error;
        }
        mode = "structured";
        messages[0] = {
          role: "system",
          content: `${systemPrompt} ${structuredOutputInstructions}\nTool reference:\n${toolReference}`,
        };
        response = await streamOllamaChat(messages, emit, mode);
      }

      if (!response.toolCalls.length) {
        if (mode === "structured" && response.summary) {
          emit("message", { text: response.summary, delta: false });
        }
        break;
      }

      if (mode === "native") {
        messages.push({
          role: "assistant",
          content: response.content,
          tool_calls: response.toolCalls,
        });
      } else {
        messages.push({ role: "assistant", content: response.content });
      }
      const structuredResults: Array<{
        name: string;
        input: unknown;
        result: unknown;
      }> = [];
      for (const call of response.toolCalls) {
        callCount++;
        if (callCount > 25) {
          emit("error", {
            error: "Generation reached the 25 tool call limit.",
          });
          return;
        }

        const { name, arguments: input } = call.function;
        const normalizedInput = normalizeToolInput(name, input);
        const parsed = toolInputs[name]?.safeParse(normalizedInput);
        if (!parsed?.success) {
          const error = parsed
            ? describeValidationError(parsed.error)
            : "Unknown tool.";
          emit("tool", { id: randomUUID(), name, input, ok: false, error });
          const result = { ok: false, error };
          if (mode === "structured") {
            structuredResults.push({ name, input, result });
          } else {
            messages.push({
              role: "tool",
              tool_name: name,
              content: JSON.stringify(result),
            });
          }
          continue;
        }

        const id = randomUUID();
        emit("tool", { id, name, input: parsed.data });
        const result = await waitForToolResult(id);
        if (mode === "structured") {
          structuredResults.push({ name, input: parsed.data, result });
        } else {
          messages.push({
            role: "tool",
            tool_name: name,
            content: JSON.stringify(result),
          });
        }
      }

      if (mode === "structured") {
        messages.push({
          role: "user",
          content: `Tool results (JSON): ${JSON.stringify(structuredResults)}. Any result with ok:false means that tool failed. Fix its arguments using the reported validation errors and retry it. Continue with remaining scene tool calls, or return an empty tool_calls array and a one-sentence summary only after all requested scene changes succeeded.`,
        });
      }
    }

    emit("done", { ok: true });
  } catch (error) {
    emit("error", { error: getOllamaErrorMessage(error) });
  }
}
