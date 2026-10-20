export type ToolResult = { ok: boolean; error?: string };

export type OpenAIToolCall = {
  id: string;
  function: { name: string; arguments: unknown };
};

export type RenderJob = {
  status: "queued" | "rendering" | "done" | "error";
  progress: number;
  error?: string;
  file?: string;
};

export type AgentEvent = (event: string, data: unknown) => void;
