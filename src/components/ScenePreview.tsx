import { useState } from 'react';
import { Player } from '@remotion/player';
import type { SceneSpec } from '../../shared/sceneSpec';
import type { ExportJob } from '../types';
import { SceneComposition } from '../remotion/SceneComposition';
import { ExportStatus } from './ExportStatus';

export function ScenePreview({ spec, job }: { spec: SceneSpec; job: ExportJob | null }) {
  const [jsonOpen, setJsonOpen] = useState(true);
  return (
    <section className="preview-panel">
      <div className="preview-heading">
        <div><div className="eyebrow">CANVAS <span className="separator">/</span> SCENE PREVIEW</div><h2>Untitled sequence</h2></div>
        <div className="preview-badges"><span className="badge"><span className="record-dot" /> LIVE</span><span className="badge">16:9</span><span className="badge">30 FPS</span></div>
      </div>

      <div className="stage-wrap">
        <div className="stage">
          <Player component={SceneComposition} inputProps={{ spec }} durationInFrames={spec.durationInFrames} fps={30} compositionWidth={1280} compositionHeight={720} style={{ width: '100%', height: '100%' }} controls loop autoPlay={spec.objects.length > 0} acknowledgeRemotionLicense />
        </div>
        <div className="stage-corner top-left" /><div className="stage-corner top-right" />
        <div className="stage-corner bottom-left" /><div className="stage-corner bottom-right" />
      </div>

      {job && <ExportStatus job={job} />}

      <div className="preview-footer">
        <span><span className="status-dot" /> Render synced</span>
        <span>{spec.objects.length} {spec.objects.length === 1 ? 'object' : 'objects'} <span className="separator">·</span> {spec.durationInFrames / spec.fps}s</span>
      </div>

      <div className="spec-panel">
        <button className="spec-heading" onClick={() => setJsonOpen(!jsonOpen)} aria-expanded={jsonOpen}>
          <span><span className="code-icon">{'{ }'}</span> SCENE SPEC <span className="read-only">READ ONLY</span></span><span>{jsonOpen ? '−' : '+'}</span>
        </button>
        {jsonOpen && <pre>{JSON.stringify(spec, null, 2)}</pre>}
      </div>
    </section>
  );
}
