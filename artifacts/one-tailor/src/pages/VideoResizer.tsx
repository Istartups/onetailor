import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, Video, X, Crown, Settings, Zap, ShieldCheck, AlertCircle, Clock, Loader2, Maximize } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge } from "@/components/shared/PremiumBadge";
import { useLocation } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import ShareSheet from "@/components/shared/ShareSheet";

// FFmpeg imports
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const RESOLUTION_PRESETS = [
  { id: "1080p", label: "1080p (FHD)", w: 1920, h: 1080 },
  { id: "720p", label: "720p (HD)", w: 1280, h: 720 },
  { id: "480p", label: "480p (SD)", w: 854, h: 480 },
  { id: "360p", label: "360p", w: 640, h: 360 },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function VideoResizer() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const mediaWorkspace = useAppStore((s) => s.mediaWorkspace);
  const setMediaWorkspace = useAppStore((s) => s.setMediaWorkspace);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resized, setResized] = useState<{ size: number; url: string; w: number; h: number; time?: number } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("720p");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ w: number; h: number } | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
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
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);
    } catch (e) {
      console.error("FFmpeg load error:", e);
      setError("Failed to load processing engine. Check your connection.");
    }
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    setVideo(file);
    setResized(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const onVideoLoad = () => {
    if (videoPreviewRef.current) {
      setVideoMeta({
        w: videoPreviewRef.current.videoWidth,
        h: videoPreviewRef.current.videoHeight
      });
    }
  };

  const handleResize = async () => {
    if (!video || !ffmpegLoaded) return;
    
    setProcessing(true);
    setProgress(0);
    setError(null);
    const startTime = Date.now();

    const ffmpeg = ffmpegRef.current;
    
    let targetW: number, targetH: number;
    
    if (selectedPreset === "custom") {
      targetW = parseInt(customW);
      targetH = parseInt(customH);
      if (isNaN(targetW) || isNaN(targetH)) {
        setError("Please enter valid custom dimensions.");
        setProcessing(false);
        return;
      }
    } else {
      const preset = RESOLUTION_PRESETS.find(p => p.id === selectedPreset)!;
      targetW = preset.w;
      targetH = preset.h;
    }

    // Ensure dimensions are even for many encoders
    targetW = Math.floor(targetW / 2) * 2;
    targetH = Math.floor(targetH / 2) * 2;

    try {
      ffmpeg.on("log", ({ message }: { message: string }) => console.log(message));
      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => setProgress(Math.round(p * 100)));

      await ffmpeg.writeFile("input.mp4", await fetchFile(video));

      // Resize command
      await ffmpeg.exec([
        "-i", "input.mp4",
        "-vf", `scale=${targetW}:${targetH}`,
        "-c:a", "copy",
        "output.mp4"
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const resizedBlob = new Blob([data as any], { type: "video/mp4" });
      
      setResized({
        size: resizedBlob.size,
        url: URL.createObjectURL(resizedBlob),
        w: targetW,
        h: targetH,
        time: Math.round((Date.now() - startTime) / 1000)
      });
      await incrementUsage();
    } catch (e) {
      console.error("Resize error:", e);
      setError("An error occurred during resizing.");
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenInTool = async (path: string) => {
    if (!resized || !video) return;
    const response = await fetch(resized.url);
    const blob = await response.blob();
    const file = new File([blob], `resized_${video.name}`, { type: "video/mp4" });
    
    setMediaWorkspace({
      id: Math.random().toString(36).substring(7),
      file,
      type: "video",
      url: resized.url,
      createdAt: new Date().toISOString()
    });
    
    setLocation(path);
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader 
        title="Change Resolution" 
        subtitle="Change video resolution and dimensions" 
        backPath="/all-tools?cat=media"
        backLabel="Media Tools"
      />

      <div className="px-4 py-5 space-y-4">
        {!isPremium && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <Crown size={20} className="text-primary shrink-0" />
            <p className="text-xs font-bold text-primary flex-1">Premium users can use custom dimensions!</p>
            <button onClick={() => setLocation("/pre-unlock")} className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">⭐ Unlock Premium</button>
          </div>
        )}

        {!video ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-base">Upload Video</p>
              <p className="text-xs text-muted-foreground mt-1">Select a video to change resolution</p>
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
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="relative aspect-video max-h-[240px] bg-black flex items-center justify-center group">
              <video 
                ref={videoPreviewRef}
                src={preview!} 
                className="w-full h-full object-contain" 
                controls 
                onLoadedMetadata={onVideoLoad}
              />
              <button
                onClick={() => { setVideo(null); setPreview(null); setResized(null); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 flex items-center justify-between border-t border-border bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <Video size={16} className="text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{video.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-muted-foreground">{videoMeta ? `${videoMeta.w}x${videoMeta.h}` : "..."}</span>
                <span className="text-[10px] font-bold text-foreground">{formatSize(video.size)}</span>
              </div>
            </div>
          </div>
        )}

        {video && !resized && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Target Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              {RESOLUTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`flex flex-col p-3 rounded-xl border transition-all ${
                    selectedPreset === preset.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <span className="text-sm font-bold">{preset.label}</span>
                  <span className="text-[10px] text-muted-foreground">{preset.w}x{preset.h}</span>
                </button>
              ))}
              <button
                disabled={!isPremium}
                onClick={() => setSelectedPreset("custom")}
                className={`flex flex-col p-3 rounded-xl border transition-all ${!isPremium ? "opacity-50 cursor-not-allowed" : ""} ${
                  selectedPreset === "custom" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/30"
                }`}
              >
                <span className="text-sm font-bold flex items-center gap-1.5">Custom {!isPremium && <Zap size={10} className="fill-primary text-primary" />}</span>
                <span className="text-[10px] text-muted-foreground">Manual size</span>
              </button>
            </div>

            {selectedPreset === "custom" && isPremium && (
              <div className="grid grid-cols-2 gap-3 pt-2 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Width</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1920" 
                    value={customW} 
                    onChange={e => setCustomW(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Height</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1080" 
                    value={customH} 
                    onChange={e => setCustomH(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" 
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={handleResize}
              disabled={processing || !ffmpegLoaded}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Processing... {progress}%
                </span>
              ) : "Change Resolution"}
            </button>
          </div>
        )}

        {resized && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Maximize size={16} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Video Resized!</span>
                  <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{resized.w}x{resized.h} • {formatSize(resized.size)}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-xl p-3 text-center border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Original</p>
                <p className="text-xs font-bold">{videoMeta ? `${videoMeta.w}x${videoMeta.h}` : "..."}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3 text-center border border-emerald-300/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">New Size</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{resized.w}x{resized.h}</p>
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
                  onClick={() => handleOpenInTool("/video-compressor")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Maximize size={14} /> Compress
                </button>
              </div>
            </div>

            <ShareSheet
              onDownload={() => {
                const a = document.createElement("a");
                a.href = resized.url;
                a.download = `resized_${video!.name}`;
                a.click();
              }}
              getFile={async () => {
                const response = await fetch(resized.url);
                const blob = await response.blob();
                return new File([blob], `resized_${video!.name}`, { type: video!.type });
              }}
              shareTitle="Resized Video"
              shareText="I just resized this video dimensions!"
            />
          </div>
        )}
      </div>
    </div>
  );
}
