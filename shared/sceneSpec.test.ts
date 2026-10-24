import { describe, expect, it } from 'vitest';
import { AnimationSchema, demoScene, emptyScene, SceneObjectSchema, SceneSpecSchema } from './sceneSpec.js';
describe('SceneSpec schema', () => {
  it('accepts the default scene and enforces 30fps', () => {
    expect(SceneSpecSchema.parse(emptyScene).fps).toBe(30);
  });
  it('requires text on text objects', () => {
    expect(SceneObjectSchema.safeParse({ id: 'title', type: 'text', color: '#ffffff', position: [0, 0, 0] }).success).toBe(false);
  });
  it('accepts football player and kick animation objects', () => {
    expect(SceneObjectSchema.safeParse({ id: 'player', type: 'footballer', color: '#2563eb', position: [0, 0, 0], animation: { kind: 'football-kick', startFrame: 0, durationInFrames: 120 } }).success).toBe(true);
    expect(AnimationSchema.safeParse({ kind: 'football-roll', startFrame: 30, durationInFrames: 90, params: { target: [3, 0.5, 0] } }).success).toBe(true);
  });
  it('accepts a driving car and uses it in the default demo scene', () => {
    expect(SceneObjectSchema.safeParse({ id: 'car', type: 'car', color: '#596fff', position: [0, 0, 0], animation: { kind: 'car-drive', startFrame: 0, durationInFrames: 240 } }).success).toBe(true);
    expect(SceneSpecSchema.parse(demoScene).objects[0].type).toBe('car');
    expect(demoScene.objects[0].animation?.kind).toBe('car-drive');
  });
  it('limits duration and object count', () => {
    expect(SceneSpecSchema.safeParse({ ...emptyScene, durationInFrames: 20 }).success).toBe(false);
    expect(SceneSpecSchema.safeParse({ ...emptyScene, objects: Array.from({ length: 41 }, (_, i) => ({ id: `${i}`, type: 'box', color: '#ffffff', position: [0, 0, 0] })) }).success).toBe(false);
  });
});
