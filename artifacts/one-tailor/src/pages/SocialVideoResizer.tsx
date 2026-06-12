import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, Video, X, Crown, Settings, Zap, ShieldCheck, AlertCircle, Clock, Loader2, Maximize } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLocation } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import ShareSheet from "@/components/shared/ShareSheet";

// FFmpeg imports
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const SOCIAL_FORMATS = [
  { id: "whatsapp_status", label: "WhatsApp Status", w: 1080, h: 1920 },
  { id: "instagram_reel", label: "Instagram Reel", w: 1080, h: 1920 },
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920 },
  { id: "youtube_shorts", label: "YouTube Shorts", w: 1080, h: 1920 },
  { id: "instagram_post", label: "Square Post", w: 1080, h: 1080 },
  { id: "youtube_landscape", label: "YouTube Landscape", w: 1920, h: 1080 },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function SocialVideoResizer() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const mediaWorkspace = useAppStore((s) => s.mediaWorkspace);
  const setMediaWorkspace = useAppStore((s) => s.setMediaWorkspace);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resized, setResized] = useState<{ size: number; url: string; w: number; h: number; time?: number } | null>(null);
  const [mode, setViewMode] = useState<"contain" | "cover">("contain");
  const [bgType, setBgType] = useState<"blur" | "color" | "auto">("blur");
  const [bgColor, setBgColor] = useState("#000000");
  const [selectedFormat, setSelectedFormat] = useState("whatsapp_status");
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
      setError("Failed to load processing engine.");
    }
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    setVideo(file);
    setResized(null);
    setError(null);
    setPreview(URL.createObjectURL(file));
  }, []);

  const onVideoLoad = () => {
    if (videoPreviewRef.current) {
      setVideoMeta({ w: videoPreviewRef.current.videoWidth, h: videoPreviewRef.current.videoHeight });
    }
  };

  const handleResize = async () => {
    if (!video || !ffmpegLoaded) return;
    setProcessing(true); setProgress(0); setError(null);
    const startTime = Date.now();
    const ffmpeg = ffmpegRef.current;
    const format = SOCIAL_FORMATS.find(f => f.id === selectedFormat)!;
    const targetW = format.w; const targetH = format.h;

    try {
      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => setProgress(Math.round(p * 100)));
      await ffmpeg.writeFile("input.mp4", await fetchFile(video));

      let filter = "";
      if (mode === "contain") {
        if (bgType === "blur") {
          filter = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,boxblur=20:10,setsar=1[bg];[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
        } else {
          const color = bgType === "auto" ? "black" : bgColor.replace("#", "0x");
          filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${color}`;
        }
      } else {
        filter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`;
      }

      await ffmpeg.exec(["-i", "input.mp4", "-vf", filter, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "copy", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      const resizedBlob = new Blob([data as any], { type: "video/mp4" });
      setResized({ size: resizedBlob.size, url: URL.createObjectURL(resizedBlob), w: targetW, h: targetH, time: Math.round((Date.now() - startTime) / 1000) });
      await incrementUsage();
    } catch (e) { setError("An error occurred during resizing."); } finally { setProcessing(false); }
  };

  const handleOpenInTool = async (path: string) => {
    if (!resized || !video) return;
    const response = await fetch(resized.url);
    const blob = await response.blob();
    const file = new File([blob], `resized_${video.name}`, { type: "video/mp4" });
    setMediaWorkspace({ id: Math.random().toString(36).substring(7), file, type: "video", url: resized.url, createdAt: new Date().toISOString() });
    setLocation(path);
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader title="Social Resizer" subtitle="Resize for WhatsApp, Reels & TikTok" backPath="/all-tools?cat=media" />
      <div className="px-4 py-5 space-y-4">
        {!video ? (
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner"><Upload size={28} className="text-primary" /></div>
            <div className="text-center"><p className="font-bold text-foreground">Upload Video</p><p className="text-xs text-muted-foreground mt-1">Select a video for social media</p></div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="relative aspect-video max-h-[240px] bg-black flex items-center justify-center group">
              <video ref={videoPreviewRef} src={preview!} className="w-full h-full object-contain" controls onLoadedMetadata={onVideoLoad} />
              <button onClick={() => { setVideo(null); setPreview(null); setResized(null); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500"><X size={14} /></button>
            </div>
            <div className="p-3 flex items-center justify-between border-t border-border bg-muted/20">
              <div className="flex items-center gap-2 min-w-0"><Video size={16} className="text-primary shrink-0" /><span className="text-xs font-medium text-foreground truncate">{video.name}</span></div>
              <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-muted-foreground">{videoMeta ? `${videoMeta.w}x${videoMeta.h}` : "..."}</span><span className="text-[10px] font-bold text-foreground">{formatSize(video.size)}</span></div>
            </div>
          </div>
        )}

        {video && !resized && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-6 shadow-sm">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Social Format</label>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_FORMATS.map((f) => (
                  <button key={f.id} onClick={() => setSelectedFormat(f.id)} className={`flex flex-col p-3 rounded-xl border text-left transition-all ${selectedFormat === f.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/30"}`}>
                    <span className="text-xs font-black uppercase tracking-tight">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">{f.w}x{f.h}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Fitting</label>
                <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
                  <button onClick={() => setViewMode("contain")} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${mode === "contain" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Contain</button>
                  <button onClick={() => setViewMode("cover")} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${mode === "cover" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Cover</button>
                </div>
              </div>
              {mode === "contain" && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Background</label>
                  <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
                    <button onClick={() => setBgType("blur")} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${bgType === "blur" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Blur</button>
                    <button onClick={() => setBgType("color")} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${bgType === "color" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Color</button>
                  </div>
                </div>
              )}
            </div>
            {mode === "contain" && bgType === "color" && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border animate-in slide-in-from-top-2">
                 <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded-md bg-transparent border-none cursor-pointer" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Custom Color</span>
              </div>
            )}
            <button onClick={handleResize} disabled={processing || !ffmpegLoaded} className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-3">
              {processing ? <><Loader2 size={18} className="animate-spin" /> {progress}%</> : <><Zap size={18} className="fill-current" /> Resize Video</>}
            </button>
          </div>
        )}

        {resized && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><ShieldCheck size={16} className="text-emerald-500" /></div><div className="flex flex-col"><span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Video Resized!</span><span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{resized.w}x{resized.h} • {formatSize(resized.size)}</span></div></div>
            
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 text-center">Continue Editing</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleOpenInTool("/video-resizer")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Maximize size={14} /> Resolution
                </button>
                <button 
                  onClick={() => handleOpenInTool("/video-compressor")}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Maximize size={14} /> Compress
                </button>
              </div>
            </div>

            <ShareSheet onDownload={() => { const a = document.createElement("a"); a.href = resized.url; a.download = `resized_${video!.name}`; a.click(); }} getFile={async () => { const response = await fetch(resized.url); const blob = await response.blob(); return new File([blob], `resized_${video!.name}`, { type: video!.type }); }} shareTitle="Resized Video" shareText="I just resized this video for social media!" />
          </div>
        )}
      </div>
    </div>
  );
}
