import { useEffect, useRef, useState } from 'react';
import { SceneSpecSchema, type SceneSpec } from '../../shared/sceneSpec';
import type { ExportJob } from '../types';

export function useVideoExport(spec: SceneSpec) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const pollTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(pollTimer.current), []);

  async function startExport() {
    window.clearTimeout(pollTimer.current);
    setJob({ id: '', progress: 0, status: 'queued' });
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: SceneSpecSchema.parse(spec) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not start export.');
      const id = String(data.id);
      setJob({ id, progress: 0, status: 'queued' });

      const poll = async () => {
        try {
          const statusResponse = await fetch(`/api/render/${id}`);
          const status = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(status.error ?? 'Could not read render status.');
          setJob({ id, progress: status.progress, status: status.status, downloadUrl: status.downloadUrl, error: status.error });
          if (status.status === 'queued' || status.status === 'rendering') pollTimer.current = window.setTimeout(poll, 900);
        } catch (error) {
          setJob({ id, progress: 0, status: 'error', error: error instanceof Error ? error.message : 'Export status failed.' });
        }
      };
      void poll();
    } catch (error) {
      setJob({ id: '', progress: 0, status: 'error', error: error instanceof Error ? error.message : 'Export failed.' });
    }
  }

  return { job, startExport };
}
