import { useState } from 'react';
import { executeTool } from '../store';
import type { ChatMessage, ToolLogEntry } from '../types';

const welcomeMessage: ChatMessage = { role: 'assistant', text: 'Describe a scene. I’ll shape the objects, motion, and lighting for you.' };

export function useAgentChat() {
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [tools, setTools] = useState<ToolLogEntry[]>([]);

  async function generate(prompt: string) {
    const text = prompt.trim();
    if (!text || busy) return;
    setMessages((items) => [...items, { role: 'user', text }]);
    setBusy(true);
    setTools([]);
    let assistantMessageStarted = false;

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error ?? 'Could not start generation.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const type = raw.match(/^event: (.+)$/m)?.[1];
          const dataLine = raw.match(/^data: (.+)$/m)?.[1];
          if (!type || !dataLine) continue;
          const data = JSON.parse(dataLine) as Record<string, unknown>;
          if (type === 'message') {
            const delta = String(data.text);
            if (data.delta === true && assistantMessageStarted) {
              setMessages((items) => {
                const last = items[items.length - 1];
                return last?.role === 'assistant'
                  ? [...items.slice(0, -1), { ...last, text: last.text + delta }]
                  : [...items, { role: 'assistant', text: delta }];
              });
            } else {
              assistantMessageStarted = true;
              setMessages((items) => [...items, { role: 'assistant', text: delta }]);
            }
          }
          if (type === 'tool') {
            const result = data.ok === false
              ? { ok: false, error: String(data.error ?? 'Invalid tool input.') }
              : executeTool(String(data.name), data.input);
            setTools((items) => [...items, { name: String(data.name), input: data.input, ...result }]);
            if (data.ok !== false) {
              void fetch('/api/agent/tool-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool_use_id: String(data.id), ...result }),
              });
            }
          }
          if (type === 'error') {
            setMessages((items) => [...items, { role: 'assistant', text: `I hit a snag: ${String(data.error)}` }]);
          }
        }
      }
    } catch (error) {
      setMessages((items) => [...items, { role: 'assistant', text: error instanceof Error ? error.message : 'Something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  }

  return { busy, messages, tools, generate };
}
