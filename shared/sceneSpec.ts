import { z } from 'zod';

export const Vector3Schema = z.tuple([z.number().min(-100).max(100), z.number().min(-100).max(100), z.number().min(-100).max(100)]);
export const BackgroundSchema = z.string().refine((value) => /^#[0-9a-fA-F]{6}$/.test(value) || (/^linear-gradient\([^)]*\)$/i.test(value) && (value.match(/#[0-9a-fA-F]{6}\b/g)?.length ?? 0) >= 2), { message: 'Expected a hex color or linear-gradient with at least two hex colors.' });
export const MaterialSchema = z.object({ metalness: z.number().min(0).max(1).optional(), roughness: z.number().min(0).max(1).optional(), emissive: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), transparent: z.boolean().optional(), opacity: z.number().min(0).max(1).optional() }).strict();
export const AnimationSchema = z.object({ kind: z.enum(['rotate', 'float', 'scale-in', 'scale-pulse', 'orbit', 'fade-in', 'move-to', 'football-kick', 'football-roll', 'car-drive']), startFrame: z.number().int().min(0), durationInFrames: z.number().int().min(1).max(900), easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-in-out'), params: z.record(z.union([z.number(), Vector3Schema])).default({}) }).strict();
export const SceneObjectBaseSchema = z.object({ id: z.string().min(1).max(80), type: z.enum(['box', 'sphere', 'cylinder', 'torus', 'text', 'plane', 'footballer', 'football', 'car']), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), position: Vector3Schema, rotation: Vector3Schema.default([0, 0, 0]), scale: Vector3Schema.default([1, 1, 1]), text: z.string().max(120).optional(), material: MaterialSchema.optional(), animation: AnimationSchema.optional() }).strict();
export const SceneObjectSchema = SceneObjectBaseSchema.superRefine((object, ctx) => { if (object.type === 'text' && !object.text) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Text objects require a text value.', path: ['text'] }); });
export const LightSchema = z.object({ id: z.string().min(1).max(80), type: z.enum(['ambient', 'directional', 'point']), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), intensity: z.number().min(0).max(10), position: Vector3Schema.optional() }).strict();
export const CameraSchema = z.object({ position: Vector3Schema, lookAt: Vector3Schema, orbit: z.object({ turns: z.number().min(1).max(3).default(1) }).optional() }).strict();
export const SceneSpecSchema = z.object({ durationInFrames: z.number().int().min(30).max(900), fps: z.literal(30).default(30), background: BackgroundSchema, camera: CameraSchema, objects: z.array(SceneObjectSchema).max(40), lights: z.array(LightSchema).max(20) }).strict();
export const emptyScene: SceneSpec = { durationInFrames: 180, fps: 30, background: '#080a12', camera: { position: [0, 1.5, 8], lookAt: [0, 0, 0] }, objects: [], lights: [{ id: 'ambient-default', type: 'ambient', color: '#ffffff', intensity: 1.3 }, { id: 'key-default', type: 'directional', color: '#c8d5ff', intensity: 2.5, position: [4, 5, 6] }] };
export const demoScene: SceneSpec = { durationInFrames: 240, fps: 30, background: 'linear-gradient(#18243a, #090d18)', camera: { position: [5, 3.2, 7], lookAt: [0, 0.55, 0], orbit: { turns: 1 } }, objects: [
  { id: 'night-run-car', type: 'car', color: '#596fff', position: [0, 0.55, 0], rotation: [0, 0, 0], scale: [1, 1, 1], animation: { kind: 'car-drive', startFrame: 0, durationInFrames: 240, easing: 'linear', params: {} } },
], lights: [{ id: 'ambient-default', type: 'ambient', color: '#c8d7ff', intensity: 1.5 }, { id: 'key-default', type: 'directional', color: '#ffffff', intensity: 3, position: [4, 7, 6] }, { id: 'fill-light', type: 'point', color: '#547dff', intensity: 4, position: [-4, 2, 3] }] };
export type Vector3 = z.infer<typeof Vector3Schema>;
export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type SceneAnimation = z.infer<typeof AnimationSchema>;
export type SceneLight = z.infer<typeof LightSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;
