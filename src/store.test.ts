import { beforeEach, describe, expect, it } from 'vitest';
import { emptyScene } from '../shared/sceneSpec';
import { actions, executeTool, store } from './store';

describe('SceneSpec tools and history', () => {
  beforeEach(() => store.dispatch(actions.clearScene()));
  it('rejects invalid object data without mutating the scene', () => {
    const result = executeTool('add_object', { id: 'bad', type: 'text', color: 'red', position: [0, 0, 0] });
    expect(result.ok).toBe(false); expect(store.getState().present.objects).toHaveLength(0);
  });
  it('adds a valid object and supports undo and redo', () => {
    expect(executeTool('add_object', { id: 'orb', type: 'sphere', color: '#ff00aa', position: [0, 0, 0] }).ok).toBe(true);
    expect(store.getState().present.objects).toHaveLength(1);
    store.dispatch(actions.undo()); expect(store.getState().present.objects).toHaveLength(0);
    store.dispatch(actions.redo()); expect(store.getState().present.objects).toHaveLength(1);
  });
  it('validates complete scenes and caps object count', () => {
    expect(executeTool('set_scene', emptyScene).ok).toBe(true);
    for (let i = 0; i < 41; i++) executeTool('add_object', { id: `box-${i}`, type: 'box', color: '#ffffff', position: [0, 0, 0] });
    expect(store.getState().present.objects).toHaveLength(40);
  });
  it('reports unknown tools', () => expect(executeTool('run_code', {}).ok).toBe(false));
});
