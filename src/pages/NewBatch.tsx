import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockAPI, type Glossary } from '@/lib/mock-data';

const LANGUAGES = [
  { code: 'zh-Hant', label: '繁體中文', sublabel: 'Traditional Chinese' },
  { code: 'en',      label: 'English',  sublabel: 'English' },
];

function FileThumb({ file, onRemove }: { file: File; onRemove: (f: File) => void }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-card border border-border">
      <img src={url} alt={file.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button onClick={() => onRemove(file)} className="text-foreground hover:text-destructive transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-background/80 text-[9px] text-muted-foreground truncate">
        {file.name}
      </div>
    </div>
  );
}

export default function NewBatch() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');
  const [selectedLangs, setSelectedLangs] = useState(['zh-Hant', 'en']);
  const [glossaryId, setGlossaryId] = useState('');
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    mockAPI.glossaries.list().then(setGlossaries);
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newFiles = accepted.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newFiles].slice(0, 500);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'] },
    maxSize: 25 * 1024 * 1024,
  });

  const toggleLang = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    if (!files.length) { setError('Add at least one image'); return; }
    if (!batchName.trim()) { setError('Enter a batch name'); return; }
    if (!selectedLangs.length) { setError('Select at least one language'); return; }

    setLoading(true);
    setError('');

    const batch = await mockAPI.batches.create(batchName, selectedLangs, glossaryId, files.length);
    navigate(`/batches/${batch.id}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground">New Batch</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload Korean product images for localization</p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Settings */}
        <div className="col-span-2 space-y-5">
          <div className="glass rounded-xl p-5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={e => setBatchName(e.target.value)}
              placeholder="e.g. Brand X Summer 2026"
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="glass rounded-xl p-5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
              Target Languages
            </label>
            <div className="space-y-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => toggleLang(lang.code)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    selectedLangs.includes(lang.code)
                      ? 'bg-primary/15 border-primary/40 text-foreground'
                      : 'border-border text-muted-foreground hover:border-ink-500'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center',
                    selectedLangs.includes(lang.code) ? 'bg-primary border-primary' : 'border-ink-600'
                  )}>
                    {selectedLangs.includes(lang.code) && (
                      <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{lang.label}</div>
                    <div className="text-xs text-muted-foreground">{lang.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
              Brand Glossary
            </label>
            <div className="relative">
              <select
                value={glossaryId}
                onChange={e => setGlossaryId(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">No glossary</option>
                {glossaries.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.entry_count} terms)</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !files.length}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl font-medium text-sm transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {loading ? 'Uploading…' : `Process ${files.length} Image${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Right: Drop zone + previews */}
        <div className="col-span-3">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4',
              isDragActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-ink-500 hover:bg-card/30'
            )}
          >
            <input {...getInputProps()} />
            <Upload size={28} className={cn('mx-auto mb-3', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
            <p className="text-sm text-foreground font-medium">Drop images here</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, TIFF, WebP · max 25 MB each · up to 500 images</p>
          </div>

          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-mono">{files.length} files selected</span>
                <button onClick={() => setFiles([])} className="text-xs text-destructive hover:underline">
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                {files.map(f => (
                  <FileThumb key={f.name + f.size} file={f} onRemove={f => setFiles(p => p.filter(x => x !== f))} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
