import { z } from "zod";
import {
  AnimationSchema,
  CameraSchema,
  LightSchema,
  SceneObjectBaseSchema,
  SceneObjectSchema,
  SceneSpecSchema,
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
  set_camera: CameraSchema,
  clear_scene: z.object({}).strict(),
};
export const agentTools = [
  {
    name: "set_scene",
    description:
      "Replace the full scene. Use for duration, background, and complete scene setup. Background accepts a hex color or a CSS linear-gradient with two or more hex colors. Objects can use box, sphere, cylinder, torus, text, plane, footballer (stylized articulated player), football, or the built-in sports car model.",
    parameters: {
      type: "object",
      properties: {
        durationInFrames: { type: "integer", minimum: 30, maximum: 900 },
        fps: { type: "integer", const: 30 },
        background: {
          type: "string",
          description: "Hex color or CSS linear-gradient with at least two #RRGGBB stops.",
        },
        camera: {
          type: "object",
          properties: {
            position: { type: "array", items: { type: "number" } },
            lookAt: { type: "array", items: { type: "number" } },
            orbit: {
              type: "object",
              description: "Optional 360-degree camera orbit around lookAt for the duration of the scene.",
              properties: { turns: { type: "number", minimum: 1, maximum: 3 } },
              required: ["turns"],
              additionalProperties: false,
            },
          },
          required: ["position", "lookAt"],
          additionalProperties: false,
        },
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
      "Add a box, sphere, low-poly cylinder, torus, text, plane, stylized articulated footballer, patterned football, or built-in sports car model with transforms and material.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: {
          type: "string",
          enum: ["box", "sphere", "cylinder", "torus", "text", "plane", "footballer", "football", "car"],
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
        material: {
          type: "object",
          properties: {
            metalness: { type: "number", minimum: 0, maximum: 1 },
            roughness: { type: "number", minimum: 0, maximum: 1 },
            emissive: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            transparent: { type: "boolean" },
            opacity: { type: "number", minimum: 0, maximum: 1 },
          },
          additionalProperties: false,
        },
        animation: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["rotate", "float", "scale-in", "scale-pulse", "orbit", "fade-in", "move-to", "football-kick", "football-roll", "car-drive"] },
            startFrame: { type: "integer", minimum: 0 },
            durationInFrames: { type: "integer", minimum: 1, maximum: 900 },
            easing: { type: "string", enum: ["linear", "ease-in", "ease-out", "ease-in-out"] },
            params: { type: "object" },
          },
          required: ["kind", "startFrame", "durationInFrames"],
          additionalProperties: false,
        },
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
      "Animate an existing scene object (mesh), NOT a light. The id must match an object created by set_scene or add_object. Lights are static and their ids cannot be animated. Use animation {kind,startFrame,durationInFrames,easing,params}. Use kind rotate|float|scale-in|scale-pulse|orbit|fade-in|move-to|football-kick|football-roll|car-drive. football-kick animates a procedural footballer; football-roll sends a football along params.target; car-drive simulates engine force, suspension, tire rotation, and road motion for the built-in sports car. Put rotation x/y/z radians, float or scale-pulse amplitude, orbit radius, and move-to/football-roll target vector inside params. startFrame and durationInFrames are required.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        animation: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["rotate", "float", "scale-in", "scale-pulse", "orbit", "fade-in", "move-to", "football-kick", "football-roll", "car-drive"] },
            startFrame: { type: "integer", minimum: 0 },
            durationInFrames: { type: "integer", minimum: 1, maximum: 900 },
            easing: { type: "string", enum: ["linear", "ease-in", "ease-out", "ease-in-out"] },
            params: { type: "object" },
          },
          required: ["kind", "startFrame", "durationInFrames"],
          additionalProperties: false,
        },
      },
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
    description: "Set camera position and look-at point. Add orbit {turns: 1} for a full 360-degree orbit over the scene duration.",
    parameters: {
      type: "object",
      properties: {
        position: { type: "array", items: { type: "number" } },
        lookAt: { type: "array", items: { type: "number" } },
        orbit: {
          type: "object",
          properties: { turns: { type: "number", minimum: 1, maximum: 3 } },
          required: ["turns"],
          additionalProperties: false,
        },
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
