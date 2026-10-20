# FrameForge — Prompt to Video

Prompt-driven, deterministic 3D motion graphics with a browser preview and MP4 export. The LLM can only request small, schema-validated scene mutations; it never writes or runs JavaScript or Three.js code.

## Stack and architecture

This is a Vite + React 18 + TypeScript client and a separate Express API in one repository. Express talks to the OpenAI API and owns Remotion rendering, while Vite gives the authoring UI a fast independent dev server. Scene data and Zod schemas live in `shared/sceneSpec.ts` and are imported by both sides.

```mermaid
flowchart LR
  A[Prompt] --> B[Express agent loop]
  B -->|validated tool call SSE| C[Redux SceneSpec]
  C --> D[Remotion Player]
  C -->|POST spec| E[Render job]
  E --> F[Remotion bundle + Chromium + ffmpeg]
  F --> G[MP4 download]
```

## Setup

1. Install Node.js 22+ and ffmpeg (for local MP4 rendering), and create an API key in the [OpenAI dashboard](https://platform.openai.com/api-keys).
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to your key. `OPENAI_MODEL` defaults to `gpt-4o`; optionally set `OPENAI_BASE_URL` for a compatible API endpoint.
5. Run `npm run dev`; open the Vite URL at `http://localhost:5173`.
6. Run `npm run typecheck`, `npm test`, or `npm run build` for validation.

The client talks to the API through the Vite `/api` proxy. The OpenAI key is used only by the server and should never be placed in client-side code. Prompts and SceneSpec data are sent to the configured OpenAI-compatible API.

## How it works

`POST /api/agent` streams assistant messages and function tool calls from OpenAI Chat Completions. Server-side Zod validation rejects malformed tool payloads; the browser applies valid operations through Redux and sends the execution result back to the model. Scene history supports undo and redo. `SceneComposition` renders the same JSON in `@remotion/player` and in Remotion's render bundle. All object animation is derived from Remotion's current frame; scene content never depends on browser wall-clock time or random values.

`POST /api/render` validates the supplied scene, creates an in-memory job, bundles the Remotion entry once per server process, then calls `selectComposition` and `renderMedia`. Poll `GET /api/render/:id`; completed jobs provide a download URL. Jobs and output files are local and in memory for this first version.

## Football scene starter

Use the **Generate a football kick scene** starter in the chat panel, or describe a player kicking a ball toward a goal. The project now includes a deterministic, stylized procedural footballer and ball with frame-based kick and roll animations, so the preview and exported MP4 stay in sync. This is a primitive-based 3D character, not a downloaded photoreal human model or an AI text-to-video model. To make photoreal live-action footage, connect a separate video-generation service that provides that capability; this project currently uses its configured OpenAI-compatible chat model only to build SceneSpec scenes.

Example prompt: “Create a cinematic 8-second 3D football scene: a stylized player in a blue kit runs up, kicks a black-and-white football toward the goal, and celebrates. Add a green pitch with white markings, two goalposts, stadium floodlights, dramatic crowd-colored background, and a slow camera push-in. Use a footballer object with football-kick animation and a football object with football-roll animation. Keep the player, ball, and goal clearly visible; use smooth motion and polished broadcast lighting.”

## Add a tool or object type

Add/adjust the Zod schema in `shared/sceneSpec.ts`. Add a named input schema and OpenAI function definition in `server/agentTools.ts`. Implement its reducer operation and dispatch in `src/store.ts`, and show the corresponding tool status in the UI. For an object type, add the union variant to `SceneObjectSchema`, then provide its geometry in `src/remotion/SceneComposition.tsx`. Keep changes JSON based and use frame-derived transforms for animation.

## Code layout

- `src/App.tsx` composes the page; `src/components/` contains the UI regions, and `src/hooks/` contains chat and export flows.
- `server/index.ts` starts the API; `server/app.ts` configures middleware and mounts routes.
- `server/routes/` handles HTTP validation and responses; `server/services/` owns OpenAI streaming, tool-result coordination, and Remotion jobs.
- `server/agentTools.ts` keeps model-facing tool definitions beside their Zod validators.

## Text and assumptions

Titles use Drei's `Text`, which renders readable SDF text without loading a font file. The default scene contains ambient and directional lights. The agent uses OpenAI's streaming chat completions and native function-tool format. Tool inputs are checked before streaming to the client and failed tool payloads are described in tool results, allowing the model to correct them. The browser applies valid streamed calls as they arrive. For simplicity the API accepts one generation request per connection and keeps render jobs in memory. Production deployment should replace that map/output folder with a queue and object storage.

## Limitations

- The agent cannot inspect rendered pixels or ask follow-up questions.
- Export requires Chromium and ffmpeg; `Dockerfile` installs these dependencies.
- Only primitive geometry, Drei text, basic lights, and the listed deterministic animation kinds are supported.
- The current streaming transport is one-way after request start; server-side schema validation is the authoritative tool result.
# GenV
