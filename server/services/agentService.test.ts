import { describe, expect, it } from "vitest";
import { AnimationSchema, MaterialSchema } from "../../shared/sceneSpec.js";
import { normalizeToolInput } from "./agentService.js";

describe("agent tool argument normalization", () => {
  it("converts variant-style rotate animations and supplies timing defaults", () => {
    const normalized = normalizeToolInput("animate_object", {
      id: "orb",
      animation: { rotate: { y: 6.28 } },
    }) as { animation: unknown };

    expect(AnimationSchema.parse(normalized.animation)).toMatchObject({
      kind: "rotate",
      startFrame: 0,
      durationInFrames: 120,
      params: { y: 6.28 },
    });
  });

  it("normalizes scale_pulse aliases and direct animation parameters", () => {
    const normalized = normalizeToolInput("animate_object", {
      id: "orb",
      animation: { kind: "scale_pulse", amplitude: 0.2 },
    }) as { animation: unknown };

    expect(AnimationSchema.parse(normalized.animation)).toMatchObject({
      kind: "scale-pulse",
      params: { amplitude: 0.2 },
    });
  });

  it("accepts material opacity and transparency", () => {
    expect(
      MaterialSchema.parse({ opacity: 0.5, transparent: true }),
    ).toEqual({ opacity: 0.5, transparent: true });
  });
});
