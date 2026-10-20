import type { ExportJob } from '../types';

export function ExportStatus({ job }: { job: ExportJob }) {
  if (job.status === 'done') {
    return <div className="export-status done" role="status"><span>✓</span> Video ready <a href={job.downloadUrl}>Download MP4 ↗</a></div>;
  }
  if (job.status === 'error') {
    return <div className="export-status error" role="status">Export failed: {job.error}</div>;
  }
  return (
    <div className="export-status" role="status">
      <span className="pulse" /> Rendering video <span className="progress-value">{job.progress}%</span>
      <div className="progress-track"><i style={{ width: `${job.progress}%` }} /></div>
    </div>
  );
}
