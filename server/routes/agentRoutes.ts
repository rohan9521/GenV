import { Router } from "express";
import { agentRateLimiter } from "../middleware/rateLimiters.js";
import { runAgent } from "../services/agentService.js";
import { submitToolResult } from "../services/toolResults.js";

const router = Router();

router.post("/", agentRateLimiter, async (req, res) => {
  const prompt =
    typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt || prompt.length > 2000) {
    res
      .status(400)
      .json({ error: "Prompt must be between 1 and 2000 characters." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const emit = (event: string, data: unknown) => {
    if (!res.writableEnded)
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  await runAgent(prompt, emit);
  res.end();
});

router.post("/tool-result", (req, res) => {
  const id =
    typeof req.body?.tool_use_id === "string" ? req.body.tool_use_id : "";
  if (!id) {
    res.status(400).json({ error: "A tool call id is required." });
    return;
  }

  const ok = req.body?.ok === true;
  const accepted = submitToolResult(id, {
    ok,
    error: ok
      ? undefined
      : typeof req.body?.error === "string"
        ? req.body.error.slice(0, 1000)
        : "Client tool execution failed.",
  });
  if (!accepted) {
    res
      .status(404)
      .json({ error: "Tool call is no longer waiting for a result." });
    return;
  }
  res.json({ ok: true });
});

export default router;
