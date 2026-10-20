import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { SceneSpec } from "../../shared/sceneSpec.js";
import type { RenderJob } from "../types.js";

const jobs = new Map<string, RenderJob>();
const outputDirectory = path.resolve("out");
let bundlePromise: Promise<string> | undefined;

async function getServeUrl() {
  bundlePromise ??= bundle({
    entryPoint: path.resolve("src/remotion/index.tsx"),
  }).catch((error: unknown) => {
    bundlePromise = undefined;
    throw error;
  });
  return bundlePromise;
}

async function renderJob(id: string, spec: SceneSpec) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "rendering";
  const file = path.join(outputDirectory, `${id}.mp4`);

  try {
    await mkdir(outputDirectory, { recursive: true });
    const serveUrl = await getServeUrl();
    const inputProps = { spec };
    const browserExecutable = process.env.CHROME_EXECUTABLE_PATH;
    const composition = await selectComposition({
      serveUrl,
      id: "PromptToVideo",
      inputProps,
      browserExecutable,
    });
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: file,
      inputProps,
      browserExecutable,
      onProgress: ({ progress }) => {
        job.progress = Math.round(progress * 100);
      },
    });
    job.status = "done";
    job.progress = 100;
    job.file = file;
  } catch (error) {
    job.status = "error";
    job.error = error instanceof Error ? error.message : "Render failed.";
  }
}

export function createRenderJob(spec: SceneSpec) {
  const id = randomUUID();
  jobs.set(id, { status: "queued", progress: 0 });
  void renderJob(id, spec);
  return id;
}

export function getRenderJob(id: string) {
  return jobs.get(id);
}
