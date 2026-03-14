import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Loader2, Plus, ChevronRight, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type Batch } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  queued:         { label: 'Queued',        color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  preprocessing:  { label: 'Preprocessing', color: 'text-blue-400',        dot: 'bg-blue-400 animate-pulse' },
  ocr:            { label: 'OCR',           color: 'text-blue-400',        dot: 'bg-blue-400 animate-pulse' },
  translating:    { label: 'Translating',   color: 'text-yellow-400',      dot: 'bg-yellow-400 animate-pulse' },
  reconstructing: { label: 'Rendering',     color: 'text-purple-400',      dot: 'bg-purple-400 animate-pulse' },
  review_ready:   { label: 'Review Ready',  color: 'text-primary',         dot: 'bg-primary' },
  complete:       { label: 'Complete',       color: 'text-green-400',       dot: 'bg-green-400' },
  failed:         { label: 'Failed',         color: 'text-destructive',     dot: 'bg-destructive' },
};

function ProgressBar({ processed, total }: { processed: number; total: number }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function Dashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.batches.list().then(data => {
      setBatches(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 5s if there are active batches
  useEffect(() => {
    const hasActive = batches.some(b => !['complete', 'failed', 'review_ready'].includes(b.status));
    if (!hasActive) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [batches]);

  const active = batches.filter(b => !['complete', 'failed', 'review_ready'].includes(b.status));
  const ready = batches.filter(b => b.status === 'review_ready');
  const done = batches.filter(b => b.status === 'complete');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Korean image localization pipeline</p>
        </div>
        <Link
          to="/batches/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-coral-600 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          New Batch
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Processing', value: active.length, icon: Loader2, color: 'text-blue-400', iconClass: active.length > 0 ? 'animate-spin' : '' },
          { label: 'Awaiting Review', value: ready.length, icon: AlertCircle, color: 'text-primary', iconClass: '' },
          { label: 'Completed', value: done.length, icon: CheckCircle, color: 'text-green-400', iconClass: '' },
        ].map(({ label, value, icon: Icon, color, iconClass }) => (
          <div key={label} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">{label}</span>
              <Icon size={18} className={cn(color, iconClass)} />
            </div>
            <div className="text-3xl font-display text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Batch list */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Recent Batches</h2>
          <span className="text-muted-foreground text-xs font-mono">{batches.length} total</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center">
            <Image size={32} className="text-ink-600 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No batches yet.</p>
            <Link to="/batches/new" className="text-primary text-sm hover:underline mt-1 inline-block">
              Create your first batch →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {batches.map(batch => {
              const cfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.queued;
              return (
                <Link
                  key={batch.id}
                  to={`/batches/${batch.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors group"
                >
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{batch.name}</span>
                      <span className={cn('text-xs ml-3 flex-shrink-0', cfg.color)}>{cfg.label}</span>
                    </div>
                    <ProgressBar processed={batch.processed_images} total={batch.total_images} />
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground font-mono">
                        {batch.processed_images}/{batch.total_images} images
                      </span>
                      {batch.avg_confidence && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {Number(batch.avg_confidence).toFixed(1)}% conf
                        </span>
                      )}
                      <span className="text-xs text-ink-600 font-mono ml-auto">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-ink-600 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
