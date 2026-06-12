import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, ImageIcon, X, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge, PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import imageCompression from "browser-image-compression";
import { useLocation } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import ShareSheet from "@/components/shared/ShareSheet";

const QUALITY_PRESETS = [
  {
    id: "high",
    label: "High Quality",
    desc: "Best for printing & archiving",
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    initialQuality: 0.92,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Good for sharing online",
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1440,
    initialQuality: 0.82,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    id: "small",
    label: "Small Size",
    desc: "Fast WhatsApp/Instagram upload",
    maxSizeMB: 0.2,
    maxWidthOrHeight: 800,
    initialQuality: 0.7,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function Compressor() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const mediaWorkspace = useAppStore((s) => s.mediaWorkspace);
  const setMediaWorkspace = useAppStore((s) => s.setMediaWorkspace);
  
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressed, setCompressed] = useState<{ file: File; url: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("balanced");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [noReduction, setNoReduction] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (mediaWorkspace && mediaWorkspace.type === "image") {
      handleFile(mediaWorkspace.file);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    setImage(file);
    setCompressed(null);
    setNoReduction(false);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleCompress = async () => {
    if (!image) return;
    const preset = QUALITY_PRESETS.find((p) => p.id === selectedPreset)!;
    setCompressing(true);
    setProgress(10);
    setNoReduction(false);
    try {
      const result = await imageCompression(image, {
        maxSizeMB: preset.maxSizeMB,
        maxWidthOrHeight: preset.maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: preset.initialQuality,
        alwaysKeepResolution: selectedPreset === "high",
        onProgress: (p) => setProgress(Math.max(p, 10)),
      });

      // Never output a file larger than the original
      if (result.size >= image.size) {
        // Re-compress at lower quality to force reduction
        const fallback = await imageCompression(image, {
          maxSizeMB: image.size / (1024 * 1024) * 0.7,
          maxWidthOrHeight: preset.maxWidthOrHeight,
          useWebWorker: true,
          initialQuality: 0.65,
          onProgress: (p) => setProgress(Math.max(p, 10)),
        });
        if (fallback.size >= image.size) {
          setNoReduction(true);
          const url = URL.createObjectURL(image);
          setCompressed({ file: image, url });
        } else {
          const url = URL.createObjectURL(fallback);
          setCompressed({ file: fallback, url });
        }
      } else {
        const url = URL.createObjectURL(result);
        setCompressed({ file: result, url });
      }
      await incrementUsage();
    } catch (e) {
      console.error(e);
    } finally {
      setCompressing(false);
      setProgress(0);
    }
  };

  const handleSaveToDevice = () => {
    if (!compressed || !image) return;
    const a = document.createElement("a");
    a.href = compressed.url;
    a.download = `compressed_${image.name}`;
    a.click();
  };

  const handleOpenInTool = (path: string) => {
    if (!compressed || !image) return;
    setMediaWorkspace({
      id: Math.random().toString(36).substring(7),
      file: compressed.file,
      type: "image",
      url: compressed.url,
      createdAt: new Date().toISOString()
    });
    setLocation(path);
  };

  const savings = image && compressed && !noReduction
    ? Math.round(((image.size - compressed.file.size) / image.size) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Image Compressor" 
        subtitle="Shrink photos without losing quality" 
        backPath="/all-tools?cat=media"
        backLabel="Media Tools"
      />

      <div className="px-4 py-5 space-y-4">
        {/* Upload */}
        {!image ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors active:scale-[0.99]"
            data-testid="upload-zone"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Upload Image</p>
              <p className="text-sm text-muted-foreground mt-1">Tap or drag & drop a photo here</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              data-testid="input-file"
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="relative">
              <img src={preview!} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={() => { setImage(null); setPreview(null); setCompressed(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-border"
                data-testid="button-remove-image"
              >
                <X size={14} className="text-foreground" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{image.name}</span>
              </div>
              <span className="text-xs font-bold text-foreground">{formatSize(image.size)}</span>
            </div>
          </div>
        )}

        {/* Quality presets */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Quality Level</label>
          <div className="space-y-2">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99] ${
                  selectedPreset === preset.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
                data-testid={`button-preset-${preset.id}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${preset.color}`}>
                  <ImageIcon size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">{preset.label}</p>
                  <p className="text-xs text-muted-foreground">{preset.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${selectedPreset === preset.id ? "border-primary bg-primary" : "border-border"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Compress button */}
        {image && !compressed && (
          <button
            onClick={handleCompress}
            disabled={compressing}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
            data-testid="button-compress"
          >
            {compressing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Compressing... {progress}%
              </span>
            ) : "Compress Image"}
          </button>
        )}

        {/* Result */}
        {compressed && (
          <div className={`${noReduction ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"} border rounded-2xl p-4 space-y-3`}>
            {noReduction ? (
              <div className="text-center py-2">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Already Optimised</p>
                <p className="text-xs text-muted-foreground mt-1">This image is already well compressed. Try "Small Size" for a smaller output.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Compression Complete!</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">-{savings}%</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted-foreground">Before</p>
                    <p className="text-base font-bold text-foreground">{formatSize(image!.size)}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3 text-center border border-emerald-300/50">
                    <p className="text-xs text-muted-foreground">After</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatSize(compressed.file.size)}</p>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 text-center">Continue Editing</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleOpenInTool("/bg-remover")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <ImageIcon size={14} /> Remove BG
                </button>
                <button 
                  onClick={() => handleOpenInTool("/watermark")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Settings2 size={14} /> Add Watermark
                </button>
              </div>
            </div>

            <ShareSheet
              onDownload={handleSaveToDevice}
              getFile={() => compressed.file}
              filename={`compressed_${image?.name ?? "image.jpg"}`}
              shareTitle="Compressed Image"
            />
            <button
              onClick={() => { setCompressed(null); setNoReduction(false); }}
              className="w-full text-center text-xs text-muted-foreground py-1 hover:text-primary"
            >
              Try different settings
            </button>
          </div>
        )}

        {/* Premium feature teaser */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Batch Compression</span>
            <PremiumBadge />
          </div>
          <p className="text-xs text-muted-foreground">Compress up to 50 images at once. Unlock Premium to use Batch Compression.</p>
        </div>
      </div>
    </div>
  );
}
