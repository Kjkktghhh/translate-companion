import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCheck, Loader2, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockAPI, type Batch, type ImageJob } from '@/lib/mock-data';

const FILTERS = [
  { value: null,      label: 'All' },
  { value: 'high',    label: '✓ High' },
  { value: 'medium',  label: '◑ Medium' },
  { value: 'low',     label: '⚠ Low' },
  { value: 'flagged', label: '⚑ Flagged' },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  high_confidence:   <CheckCircle size={12} className="text-green-400" />,
  medium_confidence: <CheckCircle size={12} className="text-yellow-400" />,
  low_confidence:    <AlertTriangle size={12} className="text-primary" />,
  flagged:           <AlertTriangle size={12} className="text-destructive" />,
  approved:          <CheckCheck size={12} className="text-green-500" />,
  processing:        <Loader2 size={12} className="text-blue-400 animate-spin" />,
  pending:           <Loader2 size={12} className="text-muted-foreground animate-spin" />,
  failed:            <XCircle size={12} className="text-destructive" />,
};

const CONF_COLOR = (score: number | null) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-primary';
};

function ImageCard({ job, onApprove, selectedLang }: { job: ImageJob; onApprove: (id: string) => void; selectedLang: string }) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden group">
      <div className="relative aspect-square bg-card overflow-hidden">
        {job.thumbnail ? (
          <img src={job.thumbnail} alt={job.filename} className="w-full h-full object-cover" />
        ) : job.output_path_zh_hant || job.output_path_en ? (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono">{job.filename}</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={20} className="text-ink-600 animate-spin" />
          </div>
        )}

        <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => setPreview(true)}
            className="p-2 bg-card rounded-lg hover:bg-secondary text-foreground transition-colors"
          >
            <Eye size={14} />
          </button>
          {job.status !== 'approved' && (
            <button
              onClick={() => onApprove(job.id)}
              className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 text-green-400 transition-colors"
            >
              <CheckCheck size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          {STATUS_ICONS[job.status] || null}
          <span className="text-[11px] text-muted-foreground truncate flex-1">{job.filename}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-mono', CONF_COLOR(job.confidence_score))}>
            {job.confidence_score ? `${job.confidence_score}%` : '—'}
          </span>
          <span className="text-[10px] text-ink-600 font-mono">
            {job.ocr_data ? `${job.ocr_data.total_blocks} blocks` : ''}
          </span>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90" onClick={() => setPreview(false)}>
          <div className="max-w-5xl w-full mx-4 glass rounded-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-medium text-foreground">{job.filename}</span>
              <button onClick={() => setPreview(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-0 overflow-auto flex-1">
              <div className="p-6">
                <div className="text-xs text-muted-foreground mb-2 font-mono">ORIGINAL (KR)</div>
                {job.thumbnail ? (
                  <img src={job.thumbnail} alt="Original" className="w-full rounded-lg" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-ink-700 to-ink-800 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Original image preview</span>
                  </div>
                )}
              </div>
              <div className="p-6 border-l border-border">
                <div className="text-xs text-muted-foreground mb-2 font-mono">
                  TRANSLATED ({selectedLang === 'zh-Hant' ? '繁體中文' : 'English'})
                </div>
                {job.ocr_blocks && job.ocr_blocks.length > 0 ? (
                  <div className="space-y-2">
                    {job.ocr_blocks.map((block, i) => (
                      <div key={i} className="glass rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground font-mono mb-1">KR: {block.korean}</div>
                        <div className="text-sm text-foreground font-medium">
                          {selectedLang === 'zh-Hant' ? block.zh_hant : block.english}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-ink-700 to-ink-800 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Translated image preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [images, setImages] = useState<ImageJob[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('zh-Hant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      mockAPI.batches.get(id),
      mockAPI.batches.getImages(id, filter),
    ]).then(([b, imgs]) => {
      setBatch(b);
      setImages(imgs);
      setLoading(false);
    });
  }, [id, filter]);

  const handleApprove = async (imageId: string) => {
    if (!id) return;
    await mockAPI.batches.approve(id, imageId);
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, status: 'approved' } : img
    ));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  if (!batch) return (
    <div className="p-8 text-center text-muted-foreground">Batch not found</div>
  );

  const isActive = !['complete', 'review_ready', 'failed'].includes(batch.status);
  const pct = batch.total_images > 0
    ? Math.round((batch.processed_images / batch.total_images) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-3 transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-display text-2xl text-foreground">{batch.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {batch.processed_images}/{batch.total_images} processed ·{' '}
            {batch.avg_confidence ? `${batch.avg_confidence.toFixed(1)}% avg confidence` : 'processing…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex glass rounded-lg overflow-hidden">
            {['zh-Hant', 'en'].map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono transition-colors',
                  selectedLang === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <a
            href={mockAPI.batches.exportZipUrl(id!)}
            className="flex items-center gap-2 px-4 py-2 glass hover:bg-secondary/50 text-foreground rounded-lg text-sm transition-colors"
          >
            <Download size={14} />
            Export ZIP
          </a>
        </div>
      </div>

      {isActive && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary-foreground capitalize">{batch.status.replace('_', ' ')}…</span>
            <span className="text-sm font-mono text-primary">{pct}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={String(f.value)}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              filter === f.value
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'glass text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.value === null && ` (${images.length})`}
          </button>
        ))}
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {isActive ? 'Images are being processed…' : 'No images match this filter'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {images.map(job => (
            <ImageCard
              key={job.id}
              job={job}
              onApprove={handleApprove}
              selectedLang={selectedLang}
            />
          ))}
        </div>
      )}
    </div>
  );
}
