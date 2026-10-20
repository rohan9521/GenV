type AppHeaderProps = {
  canUndo: boolean;
  canRedo: boolean;
  exportDisabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExport: () => void;
};

export function AppHeader({ canUndo, canRedo, exportDisabled, onUndo, onRedo, onReset, onExport }: AppHeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">F</span><span>FRAME<span className="brand-light">FORGE</span></span></a>
      <div className="project-name"><span className="live-dot" /> Untitled sequence <span className="saved-label">Saved locally</span></div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>↶</button>
        <button className="icon-button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>↷</button>
        <span className="toolbar-divider" />
        <button className="quiet-button" onClick={onReset}>Reset</button>
        <button className="export-button" onClick={onExport} disabled={exportDisabled}><span>↥</span> Export video</button>
      </div>
    </header>
  );
}
