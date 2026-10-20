export type ToolResult = { ok: boolean; error?: string };

export type OllamaToolCall = {
  function: { name: string; arguments: unknown };
};

export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
  tool_calls?: OllamaToolCall[];
};

export type RenderJob = {
  status: "queued" | "rendering" | "done" | "error";
  progress: number;
  error?: string;
  file?: string;
};

export type AgentEvent = (event: string, data: unknown) => void;
