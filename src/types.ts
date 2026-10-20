export type ChatMessage = { role: 'assistant' | 'user'; text: string };
export type ToolLogEntry = { name: string; input: unknown; ok: boolean; error?: string };
export type ExportJob = { id: string; progress: number; status: 'queued' | 'rendering' | 'done' | 'error'; downloadUrl?: string; error?: string };
