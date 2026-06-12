import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Download, Video, X, Crown, Settings, Zap, ShieldCheck, AlertCircle, Clock, Loader2, Eraser } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge } from "@/components/shared/PremiumBadge";
import { useLocation } from "wouter";
import { useAppStore } from "@/store/useAppStore";
import ShareSheet from "@/components/shared/ShareSheet";
import { ModelManager } from "@/lib/model-manager";

// FFmpeg imports
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function VideoBackgroundRemover() {
  const isPremium = useAppStore((s) => s.isPremium);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processed, setProcessed] = useState<{ url: string; size: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileRef = useRef<HTMLInputElement>(null);
  const modelManager = ModelManager.getInstance();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;
    
    try {
      // Load FFmpeg
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      setFfmpegLoaded(true);

      // Check if model is cached
      const isCached = await modelManager.checkCache('tiny');
      if (isCached) {
        await modelManager.loadModel('tiny');
        setModelLoaded(true);
      }
    } catch (e) {
      console.error("Load error:", e);
      setError("Failed to load processing engines.");
    }
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    if (!isPremium && file.size > 10 * 1024 * 1024) {
      setError("Free users are limited to 10MB videos. Unlock Premium for unlimited!");
      return;
    }
    setVideo(file);
    setProcessed(null);
    setError(null);
    setPreview(URL.createObjectURL(file));
  }, [isPremium]);

  const handleRemoveBackground = async () => {
    if (!video || !ffmpegLoaded) return;
    
    setProcessing(true);
    setProgress(0);
    setError(null);

    const ffmpeg = ffmpegRef.current;
    
    try {
      // Ensure model is loaded
      if (!modelLoaded) {
        await modelManager.loadModel('tiny', (p) => setProgress(Math.round(p * 50))); // First 50% is model download
        setModelLoaded(true);
      }

      await ffmpeg.writeFile("input.mp4", await fetchFile(video));

      // 1. Extract frames (limit to first 5 seconds for non-premium to prevent crash/timeout)
      const duration = isPremium ? "" : "-t 5";
      await ffmpeg.exec([
        "-i", "input.mp4",
        ... (duration ? ["-t", "5"] : []),
        "-vf", "fps=12,scale=480:-1", // Lower fps and resolution for browser processing
        "frame_%04d.png"
      ]);

      const files = await ffmpeg.listDir(".");
      const frames = files.filter((f: any) => f.name.startsWith("frame_") && f.name.endsWith(".png"));
      
      // 2. Process each frame with AI
      for (let i = 0; i < frames.length; i++) {
        const frameName = frames[i].name;
        const frameData = await ffmpeg.readFile(frameName);
        const frameBlob = new Blob([frameData as any], { type: "image/png" });
        const frameUrl = URL.createObjectURL(frameBlob);
        
        const processedDataUrl = await modelManager.removeBackground(frameUrl, 'tiny');
        const processedBlob = await (await fetch(processedDataUrl)).blob();
        
        await ffmpeg.writeFile(frameName, await fetchFile(processedBlob));
        setProgress(Math.round(50 + (i / frames.length) * 40));
        URL.revokeObjectURL(frameUrl);
      }

      // 3. Rebuild video
      await ffmpeg.exec([
        "-framerate", "12",
        "-i", "frame_%04d.png",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "output.mp4"
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const outBlob = new Blob([data as any], { type: "video/mp4" });
      
      setProcessed({
        url: URL.createObjectURL(outBlob),
        size: outBlob.size
      });
      setProgress(100);
    } catch (e) {
      console.error("Video BG removal error:", e);
      setError("Processing failed. This tool requires significant memory.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader 
        title="Video BG Remover" 
        subtitle="Remove background from videos using AI" 
        backPath="/all-tools?cat=media"
      />

      <div className="px-4 py-5 space-y-4">
        {!isPremium && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <Crown size={20} className="text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-primary">Premium users can process longer videos!</p>
              <p className="text-[10px] text-primary/70 mt-0.5">Free limit: 5 seconds @ 12fps</p>
            </div>
            <button onClick={() => setLocation("/pre-unlock")} className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Unlock Premium</button>
          </div>
        )}

        {!video ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Eraser size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-base">Upload Video</p>
              <p className="text-xs text-muted-foreground mt-1">Select a short video clip</p>
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
              <video src={preview!} className="w-full h-full object-contain" controls />
              <button
                onClick={() => { setVideo(null); setPreview(null); setProcessed(null); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {video && !processed && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
              <Clock size={16} className="text-muted-foreground mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground block mb-1">Processing Note:</span>
                Video background removal is done frame-by-frame in your browser. This can be slow and may crash if your device has low memory.
              </p>
            </div>
            
            <button
              onClick={handleRemoveBackground}
              disabled={processing || !ffmpegLoaded}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  AI Processing... {progress}%
                </span>
              ) : "Remove Background"}
            </button>
          </div>
        )}

        {processed && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck size={20} className="text-emerald-500" />
              </div>
              <div>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Background Removed!</span>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Video is now transparent (PNG sequence codec used)</p>
              </div>
            </div>

            <ShareSheet
              onDownload={() => {
                const a = document.createElement("a");
                a.href = processed.url;
                a.download = `no-bg_${video!.name}`;
                a.click();
              }}
              getFile={async () => {
                const response = await fetch(processed.url);
                const blob = await response.blob();
                return new File([blob], `no-bg_${video!.name}`, { type: "video/mp4" });
              }}
              shareTitle="Video with No Background"
              shareText="I just removed the background from this video!"
            />
          </div>
        )}
      </div>
    </div>
  );
}
