import { configureStore, createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { demoScene, emptyScene, SceneObjectSchema, SceneSpecSchema, type SceneObject, type SceneSpec } from '../shared/sceneSpec';

type HistoryState = { past: SceneSpec[]; present: SceneSpec; future: SceneSpec[] };
const initialState: HistoryState = { past: [], present: demoScene, future: [] };
const recordPast = (state: HistoryState) => { state.past.push(structuredClone(current(state.present))); if (state.past.length > 100) state.past.shift(); state.future = []; };
const historySlice = createSlice({ name: 'sceneHistory', initialState, reducers: {
  setScene(state, action: PayloadAction<SceneSpec>) { recordPast(state); state.present = action.payload; },
  addObject(state, action: PayloadAction<SceneObject>) { if (state.present.objects.length < 40) { recordPast(state); state.present.objects.push(action.payload); } },
  updateObject(state, action: PayloadAction<{ id: string; changes: Partial<SceneObject> }>) { const index = state.present.objects.findIndex((item) => item.id === action.payload.id); if (index >= 0) { recordPast(state); state.present.objects[index] = SceneObjectSchema.parse({ ...state.present.objects[index], ...action.payload.changes }); } },
  removeObject(state, action: PayloadAction<string>) { if (state.present.objects.some((item) => item.id === action.payload)) { recordPast(state); state.present.objects = state.present.objects.filter((item) => item.id !== action.payload); } },
  animateObject(state, action: PayloadAction<{ id: string; animation: NonNullable<SceneObject['animation']> }>) { const object = state.present.objects.find((item) => item.id === action.payload.id); if (object) { recordPast(state); object.animation = action.payload.animation; } },
  addLight(state, action: PayloadAction<SceneSpec['lights'][number]>) { if (state.present.lights.length < 20) { recordPast(state); state.present.lights.push(action.payload); } },
  setCamera(state, action: PayloadAction<SceneSpec['camera']>) { recordPast(state); state.present.camera = action.payload; },
  clearScene(state) { recordPast(state); state.present = { ...emptyScene, objects: [], lights: emptyScene.lights }; },
  undo(state) { const previous = state.past.pop(); if (previous) { state.future.unshift(state.present); state.present = previous; } },
  redo(state) { const next = state.future.shift(); if (next) { state.past.push(state.present); state.present = next; } },
  reset(state) { state.past = []; state.present = demoScene; state.future = []; },
} });
export const actions = historySlice.actions;
export const store = configureStore({ reducer: historySlice.reducer });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export function executeTool(name: string, input: unknown): { ok: boolean; error?: string } {
  try {
    switch (name) {
      case 'set_scene': store.dispatch(actions.setScene(SceneSpecSchema.parse(input))); break;
      case 'add_object': { if (store.getState().present.objects.length >= 40) throw new Error('A scene can contain at most 40 objects.'); store.dispatch(actions.addObject(SceneObjectSchema.parse(input))); break; }
      case 'update_object': { const value = input as { id?: unknown; changes?: unknown }; if (typeof value?.id !== 'string' || !value.changes || typeof value.changes !== 'object') throw new Error('Expected id and changes.'); if (!store.getState().present.objects.some((object) => object.id === value.id)) throw new Error(`Object "${value.id}" was not found.`); store.dispatch(actions.updateObject({ id: value.id, changes: value.changes as Partial<SceneObject> })); break; }
      case 'remove_object': { const value = input as { id?: unknown }; if (typeof value?.id !== 'string') throw new Error('Expected an object id.'); if (!store.getState().present.objects.some((object) => object.id === value.id)) throw new Error(`Object "${value.id}" was not found.`); store.dispatch(actions.removeObject(value.id)); break; }
      case 'animate_object': { const value = input as { id?: unknown; animation?: unknown }; if (typeof value?.id !== 'string' || !value.animation) throw new Error('Expected id and animation.'); if (!store.getState().present.objects.some((object) => object.id === value.id)) throw new Error(`Object "${value.id}" was not found.`); store.dispatch(actions.animateObject({ id: value.id, animation: value.animation as NonNullable<SceneObject['animation']> })); break; }
      case 'add_light': { if (store.getState().present.lights.length >= 20) throw new Error('A scene can contain at most 20 lights.'); const value = input as SceneSpec['lights'][number]; store.dispatch(actions.addLight(value)); break; }
      case 'set_camera': { const value = input as SceneSpec['camera']; store.dispatch(actions.setCamera(value)); break; }
      case 'clear_scene': store.dispatch(actions.clearScene()); break;
      default: throw new Error(`Unknown tool: ${name}`);
    }
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid tool input.' }; }
}
