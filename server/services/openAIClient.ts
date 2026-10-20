import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { agentTools } from "../agentTools.js";
import type { AgentEvent } from "../types.js";

type StreamedToolCall = {
  id: string;
  function: { name: string; arguments: unknown };
};

function createClient() {
  const apiKey = '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';
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your .env file.");
  }

  return new OpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.OPENAI_BASE_URL }
      : {}),
  });
}

const tools: ChatCompletionTool[] = agentTools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

export async function streamOpenAIChat(
  messages: ChatCompletionMessageParam[],
  emit: AgentEvent,
) {
  const client = createClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const stream = await client.chat.completions.create({
    model,
    messages,
    tools,
    stream: true,
  });

  const contentParts: string[] = [];
  const toolCalls = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      contentParts.push(delta.content);
      emit("message", { text: delta.content, delta: true });
    }

    for (const call of delta?.tool_calls ?? []) {
      const accumulated = toolCalls.get(call.index) ?? {
        id: "",
        name: "",
        arguments: "",
      };
      if (call.id) accumulated.id = call.id;
      if (call.function?.name) accumulated.name += call.function.name;
      if (call.function?.arguments)
        accumulated.arguments += call.function.arguments;
      toolCalls.set(call.index, accumulated);
    }
  }

  const parsedToolCalls: StreamedToolCall[] = [...toolCalls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, call]) => {
      if (!call.id || !call.name) {
        throw new Error("OpenAI returned an incomplete tool call.");
      }
      let args: unknown;
      try {
        args = JSON.parse(call.arguments);
      } catch {
        throw new Error(`OpenAI returned invalid arguments for ${call.name}.`);
      }
      return { id: call.id, function: { name: call.name, arguments: args } };
    });

  return { content: contentParts.join(""), toolCalls: parsedToolCalls };
}

export function getOpenAIErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("fetch failed")) {
    return "Cannot reach the OpenAI API. Check your internet connection and OPENAI_BASE_URL.";
  }
  return error instanceof Error ? error.message : "Agent request failed.";
}