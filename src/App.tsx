import { useDispatch, useSelector } from 'react-redux';
import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader';
import { ChatPanel } from './components/ChatPanel';
import { ScenePreview } from './components/ScenePreview';
import { actions } from './store';
import type { AppDispatch, RootState } from './store';
import { useAgentChat } from './hooks/useAgentChat';
import { useVideoExport } from './hooks/useVideoExport';

export default function App() {
  const spec = useSelector((state: RootState) => state.present);
  const canUndo = useSelector((state: RootState) => state.past.length > 0);
  const canRedo = useSelector((state: RootState) => state.future.length > 0);
  const dispatch = useDispatch<AppDispatch>();
  const chat = useAgentChat();
  const { job, startExport } = useVideoExport(spec);

  return (
    <main className="app-shell">
      <AppHeader
        canUndo={canUndo}
        canRedo={canRedo}
        exportDisabled={job?.status === 'queued' || job?.status === 'rendering'}
        onUndo={() => dispatch(actions.undo())}
        onRedo={() => dispatch(actions.redo())}
        onReset={() => dispatch(actions.reset())}
        onExport={() => void startExport()}
      />
      <div className="workspace">
        <ChatPanel messages={chat.messages} tools={chat.tools} busy={chat.busy} onGenerate={(prompt) => void chat.generate(prompt)} />
        <ScenePreview spec={spec} job={job} />
      </div>
      <AppFooter />
    </main>
  );
}
