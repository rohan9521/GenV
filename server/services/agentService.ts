import { randomUUID } from "node:crypto";
import { toolInputs } from "../agentTools.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { AgentEvent } from "../types.js";
import {
  streamOpenAIChat,
  getOpenAIErrorMessage,
} from "./openAIClient.js";
import { waitForToolResult } from "./toolResults.js";

const systemPrompt = [
  "You create concise, polished motion graphics as SceneSpec tool calls, including stylized football scenes and driving scenes using the built-in footballer, football, and sports car objects.",
  "Plan first, then build step by step. Keep duration reasonable (usually 4-8 seconds), use readable composition, tasteful colors, and add lighting.",
  "For football scenes, use object type footballer for a procedural articulated player and football for a patterned ball. Give the player the football-kick animation; give the ball football-roll animation with params.target set to its destination. Add a green pitch, visible white field markings, goal frame, and stadium lighting. The player is a stylized 3D approximation, not a photoreal human. Other anatomy can use supported box, sphere, cylinder, torus, text, and plane primitives. Backgrounds may be a hex color or CSS linear-gradient with at least two #RRGGBB stops.",
  "For driving scenes, use object type car with car-drive animation to drive the built-in sports car model using its suspension, engine force, and tire physics. Choose the car paint color and frame it clearly with a low, three-quarter camera angle and suitable lighting.",
  "When the user asks for or selects a 360-degree camera shot or orbit, include camera.orbit {turns: 1} in set_scene, or set_camera when updating an existing scene. When they request a fixed camera, omit camera.orbit. An orbit creates a smooth full camera orbit over the scene duration; do not approximate a camera orbit by rotating the car.",
  "Every object and light color must be an exact six-digit #RRGGBB hex string; never use named colors.",
  "Lights are not scene objects and cannot be animated. animate_object must use the id of an existing object created by set_scene or add_object, never a light id. To create a moving light effect, animate a visible mesh object instead; lights remain static.",
  "Do not issue dependent tool calls in the same assistant turn. After set_scene or add_object, wait for its successful result before animating that object. If a tool returns ok:false, correct and retry it before making dependent calls.",
  "Never output or execute code. Use tools only to mutate the JSON scene. Finish with a one-sentence summary.",
].join(" ");

function describeValidationError(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

export function normalizeToolInput(name: string, input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const normalized = { ...input } as Record<string, unknown>;
  const animation = name === "animate_object" || name === "add_object"
    ? normalized.animation
    : undefined;

  if (!animation || typeof animation !== "object" || Array.isArray(animation)) {
    return normalized;
  }

  const normalizedAnimation = { ...animation } as Record<string, unknown>;
  const kindAliases: Record<string, string> = {
    scale_pulse: "scale-pulse",
    scalePulse: "scale-pulse",
    scaleIn: "scale-in",
    fadeIn: "fade-in",
    moveTo: "move-to",
  };

  if (typeof normalizedAnimation.kind === "string") {
    normalizedAnimation.kind = kindAliases[normalizedAnimation.kind] ?? normalizedAnimation.kind;
  }

  const variant = Object.entries(normalizedAnimation).find(([key]) =>
    ["rotate", "float", "orbit", "scale_pulse", "scalePulse", "scale-in", "scaleIn", "fade-in", "fadeIn", "move-to", "moveTo"].includes(key),
  );
  if (variant && typeof normalizedAnimation.kind !== "string") {
    const [variantName, variantValue] = variant;
    normalizedAnimation.kind = kindAliases[variantName] ?? variantName;
    const variantParams = variantValue && typeof variantValue === "object" && !Array.isArray(variantValue)
      ? variantValue as Record<string, unknown>
      : {};
    const { [variantName]: _variant, ...otherFields } = normalizedAnimation;
    delete normalizedAnimation[variantName];
    const existingParams = otherFields.params && typeof otherFields.params === "object" && !Array.isArray(otherFields.params)
      ? otherFields.params as Record<string, unknown>
      : {};
    Object.assign(normalizedAnimation, otherFields, {
      params: { ...variantParams, ...existingParams },
    });
  }

  if (normalizedAnimation.kind === "scale_pulse" || normalizedAnimation.kind === "scalePulse") {
    normalizedAnimation.kind = "scale-pulse";
  }

  if (normalizedAnimation.kind === "rotate" || normalizedAnimation.kind === "orbit" || normalizedAnimation.kind === "float" || normalizedAnimation.kind === "scale-pulse") {
    const params = normalizedAnimation.params && typeof normalizedAnimation.params === "object" && !Array.isArray(normalizedAnimation.params)
      ? { ...normalizedAnimation.params as Record<string, unknown> }
      : {};
    for (const key of ["x", "y", "z", "amplitude", "radius"]) {
      if (typeof normalizedAnimation[key] === "number" && params[key] === undefined) {
        params[key] = normalizedAnimation[key];
        delete normalizedAnimation[key];
      }
    }
    const rotate = normalizedAnimation.rotate;
    if (normalizedAnimation.kind === "rotate" && Array.isArray(rotate) && rotate.length === 3) {
      ["x", "y", "z"].forEach((key, index) => { params[key] ??= rotate[index]; });
      delete normalizedAnimation.rotate;
    }
    normalizedAnimation.params = params;
  }

  normalizedAnimation.startFrame ??= 0;
  normalizedAnimation.durationInFrames ??= 120;
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
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];
  let callCount = 0;

  try {
    for (let turn = 0; turn < 4; turn++) {
      const response = await streamOpenAIChat(messages, emit);

      if (!response.toolCalls.length) {
        break;
      }

      messages.push({
        role: "assistant",
        content: response.content || null,
        tool_calls: response.toolCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.function.name,
            arguments: JSON.stringify(call.function.arguments),
          },
        })),
      });

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
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
          continue;
        }

        const id = randomUUID();
        emit("tool", { id, name, input: parsed.data });
        const result = await waitForToolResult(id);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    emit("done", { ok: true });
  } catch (error) {
    emit("error", { error: getOpenAIErrorMessage(error) });
  }
}
