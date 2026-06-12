import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, Download, Type, Image as ImageIcon, X, Film,
  Loader2, Layers, AlertCircle, Bold, Palette
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge, PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import ShareSheet from "@/components/shared/ShareSheet";

const POSITIONS = [
  { id: "top-left",      label: "Top Left" },
  { id: "top-center",    label: "Top Center" },
  { id: "top-right",     label: "Top Right" },
  { id: "bottom-left",   label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right",  label: "Bottom Right" },
  { id: "center",        label: "Center" },
];

const STAMP_TEMPLATES = ["SOLD", "NEW ARRIVAL", "ORDER NOW"];

type MediaType = "image" | "video";
type WatermarkType = "text" | "logo";

function getPositionCoords(
  pos: string, imgW: number, imgH: number, wmW: number, wmH: number, padding = 20
): { x: number; y: number } {
  switch (pos) {
    case "top-left":      return { x: padding, y: padding };
    case "top-center":    return { x: (imgW - wmW) / 2, y: padding };
    case "top-right":     return { x: imgW - wmW - padding, y: padding };
    case "bottom-left":   return { x: padding, y: imgH - wmH - padding };
    case "bottom-center": return { x: (imgW - wmW) / 2, y: imgH - wmH - padding };
    case "center":        return { x: (imgW - wmW) / 2, y: (imgH - wmH) / 2 };
    default:              return { x: imgW - wmW - padding, y: imgH - wmH - padding };
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  wmType: WatermarkType,
  settings: { text: string; fontSize: number; opacity: number; color: string; fontWeight?: string; textShadow?: boolean; bgOverlay?: boolean; bgOverlayColor?: string },
  logoImage: HTMLImageElement | null,
  position: string,
  wmPos: { x: number; y: number },
  scale = 1,
  subtitle = ""
) {
  const opacity = settings.opacity / 100;
  ctx.save();

  if (wmType === "text" && settings.text) {
    const fontWeight = settings.fontWeight || "bold";
    const fontSize = settings.fontSize * scale;
    const subFontSize = Math.max(8, fontSize * 0.55);
    const totalH = subtitle ? fontSize + subFontSize + 6 * scale : fontSize;

    ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
    const mainMetrics = ctx.measureText(settings.text);
    let subMetrics = { width: 0 };
    if (subtitle) {
      ctx.font = `600 ${subFontSize}px Inter, sans-serif`;
      subMetrics = ctx.measureText(subtitle);
      ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
    }
    const wmW = Math.max(mainMetrics.width, subMetrics.width);

    const { x, y } = position === "custom"
      ? wmPos
      : getPositionCoords(position, cw, ch, wmW, totalH, 20 * scale);

    // Background overlay
    if (settings.bgOverlay) {
      const pad = 8 * scale;
      ctx.globalAlpha = opacity * 0.75;
      ctx.fillStyle = settings.bgOverlayColor || "rgba(0,0,0,0.85)";
      roundRect(ctx, x - pad, y - pad / 2, wmW + pad * 2, totalH + pad, 6 * scale);
      ctx.fill();
    }

    // Main text
    ctx.globalAlpha = opacity;
    ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = settings.color;
    if (settings.textShadow !== false) {
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1 * scale;
    }
    ctx.fillText(settings.text, x, y + fontSize);

    // Subtitle
    if (subtitle) {
      ctx.font = `600 ${subFontSize}px Inter, sans-serif`;
      ctx.shadowBlur = settings.textShadow !== false ? 4 * scale : 0;
      ctx.fillText(subtitle, x, y + fontSize + subFontSize + 4 * scale);
    }
  }

  if (wmType === "logo" && logoImage) {
    const logoScale = (settings.fontSize / 100) * scale * 3;
    const wmW = logoImage.naturalWidth * logoScale;
    const wmH = logoImage.naturalHeight * logoScale;
    const { x, y } = position === "custom"
      ? wmPos
      : getPositionCoords(position, cw, ch, wmW, wmH, 20 * scale);
    ctx.globalAlpha = opacity;
    ctx.drawImage(logoImage, x, y, wmW, wmH);
  }

  ctx.restore();
}

function getSupportedMimeType(): string {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const t of types) {
    try { if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t; }
    catch { /* noop */ }
  }
  return "";
}

export default function Watermark() {
  const { 
    watermarkSettings, setWatermarkSettings, isPremium, appLogo, 
    mediaWorkspace, setMediaWorkspace, incrementUsage 
  } = useAppStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Sync with BrandKit logo
  useEffect(() => {
    if (!logoUrl) {
      const initialLogo = appLogo || "/onetailor-logo.png";
      setLogoUrl(initialLogo);
      const img = new Image();
      img.onload = () => {
        setLogoImage(img);
        logoImageRef.current = img;
      };
      img.src = initialLogo;
    }
  }, [appLogo]);

  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [position, setPosition] = useState(watermarkSettings.position);
  const [wmPos, setWmPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [subtitle, setSubtitle] = useState("");

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoError, setVideoError] = useState("");

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(false);
  // Store logo as a ref so it's always fresh inside video recording closure
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  // Stable audio context reused across exports for same video element
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const drawWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mainImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maxW = Math.min(window.innerWidth - 48, 900);
    const scale = Math.min(1, maxW / mainImage.naturalWidth);
    canvas.width = mainImage.naturalWidth * scale;
    canvas.height = mainImage.naturalHeight * scale;
    ctx.drawImage(mainImage, 0, 0, canvas.width, canvas.height);
    drawWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkType, watermarkSettings, logoImage, position, wmPos, scale, subtitle);
  }, [mainImage, logoImage, watermarkSettings, watermarkType, position, wmPos, subtitle]);

  useEffect(() => { if (mediaType === "image") drawWatermark(); }, [drawWatermark, mediaType]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // When video changes, reset audio context (new video element src = new audio source)
  useEffect(() => {
    if (videoSrc && audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* noop */ }
      audioCtxRef.current = null;
      audioSourceRef.current = null;
    }
  }, [videoSrc]);

  const loadImageFromDataUrl = (dataUrl: string, cb: (img: HTMLImageElement) => void) => {
    const img = new Image();
    img.onload = () => cb(img);
    img.src = dataUrl;
  };

  const handleMainUpload = (file: File) => {
    if (file.type.startsWith("video/")) {
      setMediaType("video");
      setVideoError("");
      const testVideo = document.createElement("video");
      const canPlay = testVideo.canPlayType(file.type);
      if (canPlay === "" && file.type !== "video/quicktime") {
        setVideoError("unsupported-format");
        setMainImage(null);
        return;
      }
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      setVideoSrc(URL.createObjectURL(file));
      setMainImage(null);
    } else {
      setMediaType("image");
      if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        loadImageFromDataUrl(dataUrl, setMainImage);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (mediaWorkspace) {
      handleMainUpload(mediaWorkspace.file);
      setMediaWorkspace(null);
    }
  }, [mediaWorkspace, setMediaWorkspace]);

  // Use FileReader data URL for logo — avoids revoked object URL issues inside canvas/video closures
  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        setLogoImage(img);
        logoImageRef.current = img;
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDragging(true);
    const rect = canvas.getBoundingClientRect();
    setWmPos({ x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) });
    setPosition("custom");
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setWmPos({ x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) });
  };

  const handleCanvasPointerUp = () => setIsDragging(false);

  const handleSaveToDevice = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.download = "watermarked.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setWatermarkSettings({ position });
    incrementUsage();
    toast({ title: "Saved!", description: "File saved to your device." });
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "watermarked.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Watermarked Image" });
      } else { handleSaveToDevice(); }
    }, "image/jpeg", 0.92);
  };

  const handleVideoWatermark = async () => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    setVideoError("");

    if (!video.videoWidth || !video.videoHeight) {
      setVideoError("Video is still loading — please wait a moment and try again.");
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setVideoError("Video recording is not supported on this browser. Please use Chrome or Edge.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasStream = canvas.captureStream(30);
    let hasAudio = false;

    // Set up audio via AudioContext (most reliable — survives background tabs and avoids capture stream issues)
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        // Reuse existing context + source if set up for this video element
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          const audioCtx: AudioContext = new AudioContextClass();
          const source = audioCtx.createMediaElementSource(video);
          source.connect(audioCtx.destination); // still audible while previewing
          audioCtxRef.current = audioCtx;
          audioSourceRef.current = source;
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === "suspended") await audioCtx.resume();
        // Create fresh destination for this export
        const dest = audioCtx.createMediaStreamDestination();
        audioSourceRef.current!.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks.forEach(t => canvasStream.addTrack(t));
          hasAudio = true;
        }
      } catch {
        // AudioContext failed — fall back to captureStream audio
        try {
          const vidStream: MediaStream | null =
            typeof (video as any).captureStream === "function" ? (video as any).captureStream() :
            typeof (video as any).mozCaptureStream === "function" ? (video as any).mozCaptureStream() : null;
          if (vidStream) {
            const audioTracks = vidStream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioTracks.forEach((t: MediaStreamTrack) => canvasStream.addTrack(t.clone()));
              hasAudio = true;
            }
          }
        } catch { /* audio not available */ }
      }
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 4_000_000 });
    } catch {
      setVideoError("Could not start video recording on this device.");
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    setIsRecording(true);
    setRecordProgress(0);
    activeRef.current = true;

    // Seek to beginning and wait for seeked event
    video.pause();
    video.muted = false;
    video.currentTime = 0;
    await new Promise<void>(resolve => {
      const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
      video.addEventListener("seeked", onSeeked);
      setTimeout(resolve, 800);
    });

    recorder.start(100);

    try {
      await video.play();
    } catch {
      activeRef.current = false;
      setIsRecording(false);
      if (recorder.state !== "inactive") recorder.stop();
      setVideoError("Could not play the video. Please try again.");
      return;
    }

    const duration = isFinite(video.duration) ? video.duration : 300;
    const recordStart = performance.now();
    let videoFinished = false;

    // Primary stop: 'ended' event (most reliable)
    video.addEventListener("ended", () => {
      if (videoFinished) return;
      videoFinished = true;
      // Allow an extra 300ms to capture final frames
      setTimeout(() => {
        activeRef.current = false;
        if (recorder.state !== "inactive") recorder.stop();
      }, 300);
    }, { once: true });

    const drawLoop = () => {
      if (!activeRef.current) return;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawWatermarkToCanvas(
          ctx, canvas.width, canvas.height,
          watermarkType, watermarkSettings,
          logoImageRef.current,
          position, wmPos, 1, subtitle
        );
      } catch { /* frame not ready */ }

      const elapsed = performance.now() - recordStart;
      setRecordProgress(Math.min(99, (video.currentTime / duration) * 100));

      // Fallback stop: only trigger after video.ended has had a chance to fire,
      // and ignore stale video.ended from before we started (first 800ms grace period)
      if (!videoFinished && elapsed > 800 && video.ended) {
        videoFinished = true;
        activeRef.current = false;
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }

      // Safety timeout: stop if duration wildly exceeded (e.g. stream video)
      if (elapsed > (duration + 5) * 1000) {
        videoFinished = true;
        activeRef.current = false;
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }

      rafRef.current = requestAnimationFrame(drawLoop);
    };

    rafRef.current = requestAnimationFrame(drawLoop);

    recorder.onstop = () => {
      activeRef.current = false;
      setIsRecording(false);
      setRecordProgress(100);

      if (chunks.length === 0) {
        setVideoError("No video data captured. Try Chrome on desktop.");
        return;
      }

      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked-video.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const note = hasAudio ? " · Audio preserved" : " · No audio track found";
      toast({ title: "Video downloaded!", description: `Watermarked video saved${note}.` });
      setTimeout(() => setRecordProgress(0), 2000);
    };
  };

  const handleBatchProcess = async () => {
    if (!batchFiles.length) return;
    setBatchProcessing(true);
    setBatchDone(0);
    for (let i = 0; i < batchFiles.length; i++) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            const sc = Math.min(1, 1600 / img.naturalWidth);
            c.width = img.naturalWidth * sc;
            c.height = img.naturalHeight * sc;
            const cx = c.getContext("2d");
            if (!cx) { resolve(); return; }
            cx.drawImage(img, 0, 0, c.width, c.height);
            drawWatermarkToCanvas(cx, c.width, c.height, watermarkType, watermarkSettings, logoImageRef.current, position, wmPos, sc, subtitle);
            const a = document.createElement("a");
            a.href = c.toDataURL("image/jpeg", 0.92);
            a.download = `${batchFiles[i].name.replace(/\.[^.]+$/, "")}-watermarked.jpg`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setBatchDone((d) => d + 1);
            setTimeout(resolve, 300);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(batchFiles[i]);
      });
    }
    setBatchProcessing(false);
    toast({ title: `Batch done!`, description: `${batchFiles.length} images watermarked.` });
    setBatchFiles([]);
  };

  const hasMedia = mainImage || videoSrc;
  const card = "bg-card border border-border rounded-2xl p-4 space-y-3";
  const inp  = "w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-background text-foreground";

  const overlayPos: React.CSSProperties = (() => {
    switch (position) {
      case "top-left":      return { top: 12, left: 12 };
      case "top-center":    return { top: 12, left: "50%", transform: "translateX(-50%)" };
      case "top-right":     return { top: 12, right: 12 };
      case "bottom-left":   return { bottom: 12, left: 12 };
      case "bottom-center": return { bottom: 12, left: "50%", transform: "translateX(-50%)" };
      case "center":        return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
      default:              return { bottom: 12, right: 12 };
    }
  })();

  return (
    <div className="max-w-xl mx-auto pb-10">
      <PageHeader 
        title="Watermark Tool" 
        subtitle="Protect your work and promote your brand" 
        backPath="/all-tools?cat=marketing"
        backLabel="Marketing Tools"
      />
      <div className="px-4 py-5 space-y-4">

        {/* Premium Banner */}
        {!isPremium && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-yellow-600" />
            </div>
            <p className="text-xs font-bold text-yellow-700/80 flex-1">Premium users can use high-resolution exports and video watermarking!</p>
            <button onClick={() => setLocation("/pre-unlock")} className="text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-yellow-950 px-3 py-1.5 rounded-lg">⭐ Unlock Premium</button>
          </div>
        )}

        {/* Upload */}
        {!hasMedia ? (
          <div
            onClick={() => mainFileRef.current?.click()}
            className="rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all active:scale-[0.99]"
            style={{ border: "2px dashed rgba(212,160,32,0.25)", background: "rgba(212,160,32,0.03)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleMainUpload(f); }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,160,32,0.12)", border: "1px solid rgba(212,160,32,0.2)" }}>
              <Upload size={26} style={{ color: "hsl(43,82%,58%)" }} />
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: "hsl(43,25%,88%)" }}>Upload Photo or Video</p>
              <p className="text-sm text-muted-foreground mt-1">Tap to select · Drag &amp; drop</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon size={11} /> JPG, PNG</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: isPremium ? "hsl(43,82%,55%)" : "hsl(218,20%,50%)" }}>
                  <Film size={11} /> MP4, MOV {!isPremium && <PremiumBadge className="ml-2" />}
                </span>
              </div>
            </div>
            <input ref={mainFileRef} type="file" accept={isPremium ? "image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/*" : "image/*"} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMainUpload(f); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {mediaType === "video" ? "Video Preview" : "Preview · Drag to reposition"}
              </span>
              <div className="flex gap-2">
                {mediaType === "image" && (
                  <button onClick={() => mainFileRef.current?.click()} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: "rgba(212,160,32,0.1)", color: "hsl(43,82%,58%)" }}>Change</button>
                )}
                <button
                  onClick={() => {
                    setMainImage(null);
                    if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); }
                    setMediaType("image"); setVideoError("");
                    activeRef.current = false;
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {mediaType === "image" && (
              <div className="rounded-2xl overflow-hidden border border-border" style={{ background: "hsl(218,44%,11%)" }}>
                <canvas ref={canvasRef} className="w-full h-auto cursor-crosshair touch-none"
                  onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp} onPointerLeave={handleCanvasPointerUp} />
              </div>
            )}

            {mediaType === "video" && videoSrc && (
              <div className="rounded-2xl overflow-hidden border border-border relative" style={{ background: "#000" }}>
                <video ref={videoRef} src={videoSrc} className="w-full block" controls playsInline
                  onLoadedMetadata={() => setVideoError("")}
                  onError={() => setVideoError("Cannot load this video. Try MP4 format.")} />

                {/* Watermark overlay preview */}
                <div className="absolute pointer-events-none select-none" style={{ ...overlayPos, zIndex: 10, maxWidth: "70%" }}>
                  {watermarkType === "text" ? (
                    <div style={{
                      color: watermarkSettings.color,
                      opacity: watermarkSettings.opacity / 100,
                      textShadow: watermarkSettings.textShadow !== false ? "0 1px 6px rgba(0,0,0,0.9)" : "none",
                      fontWeight: watermarkSettings.fontWeight || "bold",
                      fontSize: Math.max(12, watermarkSettings.fontSize * 0.5),
                      whiteSpace: "nowrap",
                      background: watermarkSettings.bgOverlay ? "rgba(0,0,0,0.7)" : "transparent",
                      padding: watermarkSettings.bgOverlay ? "3px 7px" : 0,
                      borderRadius: watermarkSettings.bgOverlay ? 4 : 0,
                    }}>
                      <div>{watermarkSettings.text}</div>
                      {subtitle && <div style={{ fontSize: "0.6em", fontWeight: 600, opacity: 0.9, marginTop: 2 }}>{subtitle}</div>}
                    </div>
                  ) : (
                    logoUrl && (
                      <img src={logoUrl} alt="Logo watermark"
                        style={{ maxWidth: 80, maxHeight: 80, opacity: watermarkSettings.opacity / 100, filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))", objectFit: "contain" }} />
                    )
                  )}
                </div>

                {isRecording && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20" style={{ background: "rgba(0,0,0,0.75)" }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: "hsl(43,82%,60%)" }} />
                    <p className="text-white font-bold text-sm">Processing... {Math.round(recordProgress)}%</p>
                    <div className="w-52 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <div className="h-full rounded-full" style={{ width: `${recordProgress}%`, background: "linear-gradient(90deg,hsl(43,82%,50%),hsl(43,90%,65%))", transition: "width 0.2s" }} />
                    </div>
                    <p className="text-xs" style={{ color: "rgba(212,160,32,0.7)" }}>Keep screen open until done</p>
                  </div>
                )}
              </div>
            )}

            {videoError === "unsupported-format" ? (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)" }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} style={{ color: "#e05555", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#e05555" }}>Oops, this video format is not currently supported.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your browser cannot play this video format directly.</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocation("/video-converter")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: "rgba(224,85,85,0.15)", color: "#e05555", border: "1px solid rgba(224,85,85,0.3)" }}>
                  <Film size={14} /> Click here to Convert Video
                </button>
              </div>
            ) : videoError ? (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.25)" }}>
                <AlertCircle size={14} style={{ color: "#e05555", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "#e05555" }}>{videoError}</p>
              </div>
            ) : null}

            <input ref={mainFileRef} type="file" accept={isPremium ? "image/*,video/*" : "image/*"} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMainUpload(f); e.target.value = ""; }} />
          </div>
        )}

        {/* Watermark settings */}
        <div className={card}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Watermark Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["text", "logo"] as const).map((type) => (
              <button key={type} onClick={() => setWatermarkType(type)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-all active:scale-95 ${watermarkType === type ? "" : "border-border bg-transparent text-muted-foreground"}`}
                style={watermarkType === type ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" } : undefined}>
                {type === "text" ? <Type size={15} /> : <ImageIcon size={15} />}
                {type === "text" ? "Text Branding" : "Logo Watermark"}
              </button>
            ))}
          </div>

          {watermarkType === "text" ? (
            <div className="space-y-3">
              <input type="text" placeholder="Brand name / title" value={watermarkSettings.text}
                onChange={(e) => setWatermarkSettings({ text: e.target.value })}
                className={`${inp} font-medium`} />

              <input type="text" placeholder="Subtitle (optional — e.g. Professional Tailoring)" value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className={inp} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1.5">Font Size</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={12} max={80} value={watermarkSettings.fontSize}
                      onChange={(e) => setWatermarkSettings({ fontSize: Number(e.target.value) })}
                      className="flex-1 accent-yellow-500" />
                    <span className="text-xs font-bold w-8 text-right" style={{ color: "hsl(43,82%,60%)" }}>{watermarkSettings.fontSize}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1.5">Opacity</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={10} max={100} value={watermarkSettings.opacity}
                      onChange={(e) => setWatermarkSettings({ opacity: Number(e.target.value) })}
                      className="flex-1 accent-yellow-500" />
                    <span className="text-xs font-bold w-8 text-right" style={{ color: "hsl(43,82%,60%)" }}>{watermarkSettings.opacity}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1.5 flex items-center gap-1"><Palette size={11} /> Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={watermarkSettings.color}
                      onChange={(e) => setWatermarkSettings({ color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent" />
                    <input type="text" value={watermarkSettings.color} maxLength={7}
                      onChange={(e) => setWatermarkSettings({ color: e.target.value })}
                      className={`${inp} flex-1 text-xs font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1.5 flex items-center gap-1"><Bold size={11} /> Weight</label>
                  <select
                    value={watermarkSettings.fontWeight || "bold"}
                    onChange={(e) => setWatermarkSettings({ fontWeight: e.target.value })}
                    className={inp}>
                    <option value="bold">Bold</option>
                    <option value="600">Semi-Bold</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              {/* Style toggles */}
              <div className="flex gap-2">
                <button
                  onClick={() => setWatermarkSettings({ textShadow: !(watermarkSettings.textShadow ?? true) })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                  style={watermarkSettings.textShadow !== false
                    ? { background: "rgba(212,160,32,0.12)", borderColor: "rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "hsl(218,38%,22%)", color: "hsl(43,20%,60%)" }}>
                  Shadow {watermarkSettings.textShadow !== false ? "On" : "Off"}
                </button>
                <button
                  onClick={() => setWatermarkSettings({ bgOverlay: !watermarkSettings.bgOverlay })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                  style={watermarkSettings.bgOverlay
                    ? { background: "rgba(212,160,32,0.12)", borderColor: "rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "hsl(218,38%,22%)", color: "hsl(43,20%,60%)" }}>
                  BG Box {watermarkSettings.bgOverlay ? "On" : "Off"}
                </button>
              </div>

              {/* BG Box Color */}
              {watermarkSettings.bgOverlay && (
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1.5">Background Box Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={watermarkSettings.bgOverlayColor?.startsWith("rgba") ? "#000000" : (watermarkSettings.bgOverlayColor || "#000000")}
                      onChange={(e) => setWatermarkSettings({ bgOverlayColor: e.target.value + "d9" })}
                      className="w-10 h-10 rounded-xl border cursor-pointer" style={{ borderColor: "hsl(218,38%,22%)", background: "none" }} />
                    <div className="flex gap-1.5 flex-wrap">
                      {[["#000000d9","Black"],["#ffffffd9","White"],["#d4a020cc","Gold"],["#1e40afd9","Blue"],["#991b1bd9","Red"]].map(([c,l]) => (
                        <button key={c} onClick={() => setWatermarkSettings({ bgOverlayColor: c })}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all"
                          style={{
                            background: c,
                            borderColor: watermarkSettings.bgOverlayColor === c ? "white" : "transparent",
                            color: l === "White" ? "#000" : "#fff",
                            minWidth: 42,
                          }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick stamp buttons */}
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1.5">Quick Stamps</label>
                <div className="flex flex-wrap gap-2">
                  {STAMP_TEMPLATES.map((s) => (
                    <button key={s} onClick={() => setWatermarkSettings({ text: s })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95"
                      style={{ borderColor: "hsl(218,38%,22%)", background: "rgba(255,255,255,0.03)", color: "hsl(43,25%,75%)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Logo upload */}
              <div
                onClick={() => logoFileRef.current?.click()}
                className="rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer border border-dashed transition-all"
                style={{ borderColor: "rgba(212,160,32,0.2)", background: "rgba(212,160,32,0.03)" }}>
                {logoUrl ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl w-full" style={{ background: "rgba(212,160,32,0.05)", border: "1px solid rgba(212,160,32,0.15)" }}>
                    <img src={logoUrl} alt="Logo preview" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6 }} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: "hsl(43,82%,60%)" }}>Logo uploaded</p>
                      <p className="text-xs text-muted-foreground">Tap to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={22} style={{ color: "rgba(212,160,32,0.4)" }} />
                    <p className="text-xs font-medium" style={{ color: "rgba(212,160,32,0.6)" }}>Tap to upload logo</p>
                    <p className="text-[11px] text-muted-foreground">PNG with transparent background works best</p>
                  </>
                )}
              </div>
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1.5">Logo Size</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={10} max={100} value={watermarkSettings.fontSize}
                    onChange={(e) => setWatermarkSettings({ fontSize: Number(e.target.value) })}
                    className="flex-1 accent-yellow-500" />
                  <span className="text-xs font-bold w-8 text-right" style={{ color: "hsl(43,82%,60%)" }}>{watermarkSettings.fontSize}%</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1.5">Opacity</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={10} max={100} value={watermarkSettings.opacity}
                    onChange={(e) => setWatermarkSettings({ opacity: Number(e.target.value) })}
                    className="flex-1 accent-yellow-500" />
                  <span className="text-xs font-bold w-8 text-right" style={{ color: "hsl(43,82%,60%)" }}>{watermarkSettings.opacity}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Position */}
        <div className={card}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Position {position === "custom" && <span style={{ color: "hsl(43,82%,58%)" }}>· Custom (dragged)</span>}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {POSITIONS.map(({ id, label }) => (
              <button key={id} onClick={() => setPosition(id)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${position === id ? "" : "border-border bg-transparent text-muted-foreground"}`}
                style={position === id ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" } : undefined}>
                {label}
              </button>
            ))}
          </div>
          {mainImage && <p className="text-[11px] text-muted-foreground">Or drag directly on the image preview above</p>}
        </div>

        {/* Actions */}
        {hasMedia && (
          <div className="space-y-2">
            {mediaType === "image" ? (
              <div>
                <ShareSheet
                  onDownload={handleSaveToDevice}
                  getFile={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return null;
                    let f: File | null = null;
                    canvas.toBlob((b) => { if (b) f = new File([b], "watermarked.jpg", { type: "image/jpeg" }); }, "image/jpeg", 0.92);
                    return f;
                  }}
                  filename="watermarked.jpg"
                  shareTitle="Watermarked Image"
                /></div>
            ) : isPremium ? (
              <button onClick={handleVideoWatermark} disabled={isRecording || !videoSrc}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: isRecording ? "rgba(212,160,32,0.1)" : "linear-gradient(135deg,hsl(43,82%,48%),hsl(43,90%,60%))", color: isRecording ? "hsl(43,82%,60%)" : "hsl(218,50%,8%)" }}>
                {isRecording ? (<><Loader2 size={16} className="animate-spin" /> Processing {Math.round(recordProgress)}%...</>) : (<><Film size={16} /> Apply Watermark &amp; Download Video</>)}
              </button>
            ) : (
              <PremiumLockedOverlay onUnlock={() => setLocation("/pre-unlock")}>
                <button disabled className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm opacity-30"
                  style={{ background: "rgba(212,160,32,0.1)", color: "hsl(43,82%,60%)" }}>
                  <Film size={16} /> Apply Watermark to Video
                </button>
              </PremiumLockedOverlay>
            )}
          </div>
        )}

        {/* Batch watermark (Premium) */}
        {isPremium ? (
          <div className={card}>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-2">
              <Layers size={13} /> Batch Watermark <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>
            </label>
            <div
              onClick={() => batchFileRef.current?.click()}
              className="rounded-xl p-3 flex items-center gap-3 cursor-pointer border border-dashed"
              style={{ borderColor: "rgba(212,160,32,0.2)", background: "rgba(212,160,32,0.03)" }}>
              <Upload size={16} style={{ color: "rgba(212,160,32,0.5)" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "rgba(212,160,32,0.7)" }}>
                  {batchFiles.length > 0 ? `${batchFiles.length} files selected` : "Select multiple images"}
                </p>
                <p className="text-[11px] text-muted-foreground">All will use the current watermark settings</p>
              </div>
            </div>
            <input ref={batchFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) setBatchFiles(Array.from(e.target.files)); e.target.value = ""; }} />
            {batchFiles.length > 0 && (
              <button onClick={handleBatchProcess} disabled={batchProcessing}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,hsl(43,82%,48%),hsl(43,90%,60%))", color: "hsl(218,50%,8%)" }}>
                {batchProcessing ? <><Loader2 size={14} className="animate-spin" /> {batchDone}/{batchFiles.length} done...</> : <><Download size={14} /> Watermark All ({batchFiles.length})</>}
              </button>
            )}
          </div>
        ) : (
          <div className={card}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Batch Watermark</span>
              </div>
              <PremiumBadge />
            </div>
            <p className="text-xs text-muted-foreground">
              Watermark 10, 50, 100 images at once.{" "}
              <button onClick={() => setLocation("/pre-unlock")} className="text-yellow-600 font-bold hover:underline underline-offset-2">
                ⭐ Unlock Premium to use Batch Watermark.
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
