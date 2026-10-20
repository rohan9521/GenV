import { Router } from "express";
import { SceneSpecSchema } from "../../shared/sceneSpec.js";
import { renderRateLimiter } from "../middleware/rateLimiters.js";
import { createRenderJob, getRenderJob } from "../services/renderService.js";

const router = Router();

router.post("/", renderRateLimiter, (req, res) => {
  const parsed = SceneSpecSchema.safeParse(req.body?.spec);
  if (!parsed.success) {
    const error = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    res.status(400).json({ error });
    return;
  }

  const id = createRenderJob(parsed.data);
  res.status(202).json({ id });
});

router.get("/:id", (req, res) => {
  const job = getRenderJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Render job not found." });
    return;
  }

  res.json({
    status: job.status,
    progress: job.progress,
    error: job.error,
    downloadUrl:
      job.status === "done"
        ? `/api/render/${req.params.id}/download`
        : undefined,
  });
});

router.get("/:id/download", (req, res) => {
  const job = getRenderJob(req.params.id);
  if (!job?.file || job.status !== "done") {
    res.status(404).json({ error: "Video is not ready." });
    return;
  }
  res.download(job.file);
});

export default router;
