import { z } from "zod";
import {
  AnimationSchema,
  LightSchema,
  SceneObjectBaseSchema,
  SceneObjectSchema,
  SceneSpecSchema,
  Vector3Schema,
} from "../shared/sceneSpec.js";

export const toolInputs: Record<string, z.ZodType> = {
  set_scene: SceneSpecSchema,
  add_object: SceneObjectSchema,
  update_object: z
    .object({
      id: z.string(),
      changes: SceneObjectBaseSchema.partial().omit({ id: true }),
    })
    .strict(),
  remove_object: z.object({ id: z.string() }).strict(),
  animate_object: z
    .object({ id: z.string(), animation: AnimationSchema })
    .strict(),
  add_light: LightSchema,
  set_camera: z
    .object({ position: Vector3Schema, lookAt: Vector3Schema })
    .strict(),
  clear_scene: z.object({}).strict(),
};
export const agentTools = [
  {
    name: "set_scene",
    description:
      "Replace the full scene. Use for duration, background, and complete scene setup.",
    parameters: {
      type: "object",
      properties: {
        durationInFrames: { type: "integer", minimum: 30, maximum: 900 },
        fps: { type: "integer", const: 30 },
        background: { type: "string" },
        camera: { type: "object" },
        objects: { type: "array" },
        lights: { type: "array" },
      },
      required: [
        "durationInFrames",
        "background",
        "camera",
        "objects",
        "lights",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "add_object",
    description:
      "Add a box, sphere, torus, text, or plane with transforms and material.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: {
          type: "string",
          enum: ["box", "sphere", "torus", "text", "plane"],
        },
        color: { type: "string" },
        position: {
          type: "array",
          items: { type: "number" },
          minItems: 3,
          maxItems: 3,
        },
        rotation: {
          type: "array",
          items: { type: "number" },
          minItems: 3,
          maxItems: 3,
        },
        scale: {
          type: "array",
          items: { type: "number" },
          minItems: 3,
          maxItems: 3,
        },
        text: { type: "string" },
        material: { type: "object" },
      },
      required: ["id", "type", "color", "position"],
      additionalProperties: false,
    },
  },
  {
    name: "update_object",
    description: "Update a named object using partial fields.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" }, changes: { type: "object" } },
      required: ["id", "changes"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_object",
    description: "Remove an object by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "animate_object",
    description:
      "Set an object animation. rotate params x/y/z in radians; float amplitude; orbit radius; move-to target; fade-in/scale-in need no params.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" }, animation: { type: "object" } },
      required: ["id", "animation"],
      additionalProperties: false,
    },
  },
  {
    name: "add_light",
    description: "Add an ambient, directional, or point light.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string", enum: ["ambient", "directional", "point"] },
        color: { type: "string" },
        intensity: { type: "number" },
        position: { type: "array", items: { type: "number" } },
      },
      required: ["id", "type", "color", "intensity"],
      additionalProperties: false,
    },
  },
  {
    name: "set_camera",
    description: "Set camera position and look-at point.",
    parameters: {
      type: "object",
      properties: {
        position: { type: "array", items: { type: "number" } },
        lookAt: { type: "array", items: { type: "number" } },
      },
      required: ["position", "lookAt"],
      additionalProperties: false,
    },
  },
  {
    name: "clear_scene",
    description: "Remove all scene objects and return to defaults.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
];
