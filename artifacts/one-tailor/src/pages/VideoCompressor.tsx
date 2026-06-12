import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, Video, X, Crown, Settings, Zap, ShieldCheck, AlertCircle, Clock, Loader2, Maximize } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge } from "@/components/shared/PremiumBadge";
import { useLocation } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import ShareSheet from "@/components/shared/ShareSheet";

// FFmpeg imports
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const QUALITY_PRESETS = [
  {
    id: "low",
    label: "Small Size",
    desc: "Best for WhatsApp sharing",
    crf: "32",
    ratio: 0.25,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "medium",
    label: "Balanced",
    desc: "Recommended quality",
    crf: "28",
    ratio: 0.45,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    id: "high",
    label: "High Quality",
    desc: "Best visual quality",
    crf: "24",
    ratio: 0.7,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
];

const PREMIUM_FEATURES = [
  { id: "ultra", label: "Ultra Compression", desc: "Maximum size reduction", icon: Zap },
  { id: "bitrate", label: "Custom Bitrate", desc: "Fine-tune output quality", icon: Settings },
  { id: "resolution", label: "Custom Resolution", desc: "Resize video dimensions", icon: ShieldCheck },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function VideoCompressor() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const mediaWorkspace = useAppStore((s) => s.mediaWorkspace);
  const setMediaWorkspace = useAppStore((s) => s.setMediaWorkspace);
  const { toast } = useToast();
  
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressed, setCompressed] = useState<{ size: number; url: string; time?: number } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("medium");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [compressionError, setCompressionError] = useState<string | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadFFmpeg();
    if (mediaWorkspace && mediaWorkspace.type === "video") {
      handleFile(mediaWorkspace.file);
    }
  }, []);

  const loadFFmpeg = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;
    
    const timeout = setTimeout(() => {
      if (!ffmpegLoaded) {
        setCompressionError("Compression engine failed to start. Please check your connection and retry.");
      }
    }, 20000); // 20 seconds timeout

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);
      clearTimeout(timeout);
    } catch (e) {
      console.error("FFmpeg load error:", e);
      setCompressionError("Failed to load compression engine. Check your connection.");
      clearTimeout(timeout);
    }
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    setVideo(file);
    setCompressed(null);
    setCompressionError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) handleFile(file);
  };

  const handleCompress = async () => {
    if (!video || !ffmpegLoaded) return;
    
    setCompressing(true);
    setProgress(0);
    setCompressionError(null);
    const startTime = Date.now();

    const ffmpeg = ffmpegRef.current;
    const preset = QUALITY_PRESETS.find((p) => p.id === selectedPreset)!;
    
    try {
      // Monitor progress
      ffmpeg.on("log", ({ message }: { message: string }) => {
        console.log(message);
      });

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      // Write file to FFmpeg's virtual FS
      await ffmpeg.writeFile("input.mp4", await fetchFile(video));

      // Execute compression command
      // -i input.mp4: input file
      // -vcodec libx264: video codec
      // -crf: Constant Rate Factor (18-28 is good range, higher = smaller size)
      // -preset faster: encoding speed vs efficiency
      // -acodec copy: copy audio without re-encoding (saves time)
      await ffmpeg.exec([
        "-i", "input.mp4",
        "-vcodec", "libx264",
        "-crf", preset.crf,
        "-preset", "faster",
        "-acodec", "aac",
        "output.mp4"
      ]);

      // Read result
      const data = await ffmpeg.readFile("output.mp4");
      const compressedBlob = new Blob([data as any], { type: "video/mp4" });
      
      // Verification layer
      if (compressedBlob.size > video.size * 0.98) {
        setCompressionError("Compression ineffective. The file is already highly optimized. Try a lower quality preset.");
        setCompressing(false);
        return;
      }

      setCompressed({
        size: compressedBlob.size,
        url: URL.createObjectURL(compressedBlob),
        time: Math.round((Date.now() - startTime) / 1000)
      });
      await incrementUsage();
    } catch (e) {
      console.error("Compression error:", e);
      setCompressionError("An error occurred during compression. Please try a different video.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSaveToDevice = () => {
    if (!compressed || !video) return;
    const a = document.createElement("a");
    a.href = compressed.url;
    const ext = video.name.split('.').pop();
    a.download = `compressed_${video.name.replace(`.${ext}`, ".mp4")}`;
    a.click();
    toast({ title: "Saved!", description: "Video saved to your device." });
  };

  const handleOpenInTool = async (path: string) => {
    if (!compressed || !video) return;
    const response = await fetch(compressed.url);
    const blob = await response.blob();
    const file = new File([blob], `compressed_${video.name}`, { type: "video/mp4" });
    
    setMediaWorkspace({
      id: Math.random().toString(36).substring(7),
      file,
      type: "video",
      url: compressed.url,
      createdAt: new Date().toISOString()
    });
    
    setLocation(path);
  };

  const savings = video && compressed
    ? Math.round(((video.size - compressed.size) / video.size) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader 
        title="Video Compressor" 
        subtitle="Reduce video size for easy sharing" 
        backPath="/all-tools?cat=media"
        backLabel="Media Tools"
      />

      <div className="px-4 py-5 space-y-4">
        {/* Premium Notification for Free Users */}
        {!isPremium && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Crown size={20} className="text-primary shrink-0" />
            <p className="text-xs font-bold text-primary flex-1">Premium users get access to Ultra Compression & Custom Bitrate!</p>
            <button onClick={() => setLocation("/upgrade")} className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">⭐ Unlock Premium</button>
          </div>
        )}

        {/* Upload Area */}
        {!video ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-base">Upload Video</p>
              <p className="text-xs text-muted-foreground mt-1">Tap or drag & drop a video file here</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-200">
            <div className="relative aspect-video max-h-[240px] bg-black flex items-center justify-center group">
              <video src={preview!} className="w-full h-full object-contain" controls />
              <button
                onClick={() => { 
                  if (preview) URL.revokeObjectURL(preview);
                  setVideo(null); 
                  setPreview(null); 
                  setCompressed(null); 
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 text-white hover:bg-red-500 transition-colors"
                title="Remove video"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 flex items-center justify-between border-t border-border bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <Video size={16} className="text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{video.name}</span>
              </div>
              <span className="text-xs font-bold text-foreground shrink-0">{formatSize(video.size)}</span>
            </div>
          </div>
        )}

        {/* Quality presets */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Compression Level</label>
          <div className="space-y-2">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99] ${
                  selectedPreset === preset.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${preset.color}`}>
                  <Video size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">{preset.label}</p>
                  <p className="text-[11px] text-muted-foreground">Estimated: {formatSize(video ? video.size * preset.ratio : 0)}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${selectedPreset === preset.id ? "border-primary bg-primary" : "border-border"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Premium Features Teaser */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Advanced Options</h3>
            <PremiumBadge />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {PREMIUM_FEATURES.map((feat) => (
              <div key={feat.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border opacity-60">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <feat.icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">{feat.label}</p>
                  <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {!isPremium && (
            <button
              onClick={() => setLocation("/pre-unlock")}
              className="w-full py-3 bg-primary/10 text-primary font-bold rounded-xl text-xs active:scale-[0.98] transition-transform"
            >
              Unlock Premium to Access Advanced Features
            </button>
          )}
        </div>

        {/* Compress button */}
        {video && !compressed && (
          <div className="space-y-3">
            {!ffmpegLoaded && !compressionError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold">
                <Loader2 size={14} className="animate-spin" />
                Initializing compression engine...
              </div>
            )}
            
            {compressionError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in shake duration-500">
                  <AlertCircle size={14} />
                  {compressionError}
                </div>
                {compressionError.includes("failed to start") && (
                  <button 
                    onClick={() => { setCompressionError(null); loadFFmpeg(); }}
                    className="w-full py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-colors"
                  >
                    Retry Initialization
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleCompress}
              disabled={compressing || !ffmpegLoaded}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {compressing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Compressing... {progress}%
                </span>
              ) : "Compress Video"}
            </button>
          </div>
        )}

        {/* Result Area */}
        {compressed && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Zap size={16} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Compressed Successfully!</span>
                  {compressed.time && (
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 flex items-center gap-1">
                      <Clock size={10} /> {compressed.time} seconds
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">-{savings}%</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Original</p>
                <p className="text-base font-bold text-foreground">{formatSize(video!.size)}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3 text-center border border-emerald-300/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Compressed</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatSize(compressed.size)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 text-center">Continue Editing</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleOpenInTool("/social-video-resizer")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Video size={14} /> Social Resize
                </button>
                <button 
                  onClick={() => handleOpenInTool("/video-resizer")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Maximize size={14} /> Resolution
                </button>
              </div>
            </div>

            <ShareSheet
              onDownload={handleSaveToDevice}
              getFile={async () => {
                if (compressed?.url) {
                  const response = await fetch(compressed.url);
                  const blob = await response.blob();
                  return new File([blob], `compressed_${video!.name}`, { type: video!.type });
                }
                return new File([video!], `compressed_${video!.name}`, { type: video!.type });
              }}
              shareTitle="Compressed Video"
              shareText="Check out this video!"
            />
          </div>
        )}
      </div>
    </div>
  );
}
