import { describe, expect, it } from 'vitest';
import { emptyScene, SceneObjectSchema, SceneSpecSchema } from './sceneSpec.js';

describe('SceneSpec schema', () => {
  it('accepts the default scene and enforces 30fps', () => {
    expect(SceneSpecSchema.parse(emptyScene).fps).toBe(30);
  });
  it('requires text on text objects', () => {
    expect(SceneObjectSchema.safeParse({ id: 'title', type: 'text', color: '#ffffff', position: [0, 0, 0] }).success).toBe(false);
  });
  it('limits duration and object count', () => {
    expect(SceneSpecSchema.safeParse({ ...emptyScene, durationInFrames: 20 }).success).toBe(false);
    expect(SceneSpecSchema.safeParse({ ...emptyScene, objects: Array.from({ length: 41 }, (_, i) => ({ id: `${i}`, type: 'box', color: '#ffffff', position: [0, 0, 0] })) }).success).toBe(false);
  });
});
