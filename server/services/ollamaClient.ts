import { agentTools } from "../agentTools.js";
import type { AgentEvent, OllamaMessage, OllamaToolCall } from "../types.js";
import { z } from "zod";

type OllamaChunk = {
  message?: { content?: string; tool_calls?: OllamaToolCall[] };
  error?: string;
};

const StructuredToolResponseSchema = z
  .object({
    tool_calls: z.array(
      z
        .object({
          name: z.string(),
          arguments: z.record(z.unknown()),
        })
        .strict(),
    ),
    summary: z.string(),
  })
  .strict();

const structuredToolResponseFormat = {
  type: "object",
  properties: {
    tool_calls: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: agentTools.map((tool) => tool.name) },
          arguments: { type: "object" },
        },
        required: ["name", "arguments"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["tool_calls", "summary"],
  additionalProperties: false,
};

export class OllamaToolSupportError extends Error {
  constructor() {
    super("The configured Ollama model does not support native tools.");
    this.name = "OllamaToolSupportError";
  }
}

function getToolDefinitions() {
  return agentTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function getConnectionError() {
  const endpoint = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  return `Cannot reach Ollama at ${endpoint}. Start Ollama and ensure the selected model is installed.`;
}

export async function streamOllamaChat(
  messages: OllamaMessage[],
  emit: AgentEvent,
  mode: "native" | "structured" = "native",
) {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3";
  const response = await fetch(new URL("/api/chat", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      ...(mode === "native"
        ? { tools: getToolDefinitions() }
        : { format: structuredToolResponseFormat }),
      stream: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (mode === "native" && detail.includes("does not support tools")) {
      throw new OllamaToolSupportError();
    }
    if (response.status === 404 && detail.includes("not found")) {
      throw new Error(
        `Ollama model "${model}" is not installed. Run "ollama pull ${model}", or set OLLAMA_MODEL in .env to a tool-capable model shown by "ollama list".`,
      );
    }
    throw new Error(
      `Ollama returned ${response.status}: ${detail.slice(0, 500)}`,
    );
  }
  if (!response.body)
    throw new Error("Ollama returned an empty response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolCalls: OllamaToolCall[] = [];
  let content = "";
  let buffer = "";

  function consumeLine(line: string) {
    if (!line.trim()) return;
    const chunk = JSON.parse(line) as OllamaChunk;
    if (chunk.error) throw new Error(chunk.error);

    const delta = chunk.message?.content;
    if (delta) {
      content += delta;
      if (mode === "native") emit("message", { text: delta, delta: true });
    }
    if (chunk.message?.tool_calls) toolCalls.push(...chunk.message.tool_calls);
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
    }

    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);
  } finally {
    reader.releaseLock();
  }

  if (mode === "structured") {
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      throw new Error(
        "Ollama returned invalid JSON for the structured tool response.",
      );
    }
    const parsed = StructuredToolResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `Ollama returned an invalid structured tool response: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      );
    }
    return {
      content,
      toolCalls: parsed.data.tool_calls.map((call) => ({
        function: { name: call.name, arguments: call.arguments },
      })),
      summary: parsed.data.summary,
    };
  }

  return { content, toolCalls, summary: "" };
}

export function getOllamaErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Agent request failed.";
  return message.includes("fetch failed") ? getConnectionError() : message;
}
