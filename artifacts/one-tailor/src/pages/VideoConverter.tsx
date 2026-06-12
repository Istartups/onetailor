import { useState, useRef } from "react";
import { Upload, Download, X, Loader2, Film, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

function getSupportedOutputType(): string {
  const types = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const t of types) {
    try { if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t; }
    catch { /* noop */ }
  }
  return "video/webm";
}

export default function VideoConverter() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const handleUpload = (file: File) => {
    setFileName(file.name);
    setError("");
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };

  const handleConvert = async () => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    if (!video.videoWidth || !video.videoHeight) {
      setError("Video is still loading — please wait a moment and try again.");
      return;
    }

    const mimeType = getSupportedOutputType();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);

    // Try to capture audio
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      try {
        const ac = new AudioCtx();
        const src = ac.createMediaElementSource(video);
        const dest = ac.createMediaStreamDestination();
        src.connect(dest);
        src.connect(ac.destination);
        dest.stream.getAudioTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
      } catch { /* no audio */ }
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    } catch {
      setError("Video conversion is not supported on this browser. Please use Chrome or Edge.");
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    setConverting(true);
    setProgress(0);

    video.currentTime = 0;
    await new Promise<void>(r => {
      const s = () => { video.removeEventListener("seeked", s); r(); };
      video.addEventListener("seeked", s);
      setTimeout(r, 600);
    });

    recorder.start(100);
    await video.play().catch(() => {});

    const duration = isFinite(video.duration) ? video.duration : 120;
    let stopped = false;

    video.addEventListener("ended", () => {
      if (stopped) return;
      stopped = true;
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 300);
    }, { once: true });

    const raf = () => {
      if (stopped) return;
      try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { /* noop */ }
      setProgress(Math.min(99, (video.currentTime / duration) * 100));
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    recorder.onstop = () => {
      stopped = true;
      setConverting(false);
      setProgress(100);
      if (chunks.length === 0) { setError("Conversion failed — no data captured. Try Chrome desktop."); return; }
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.[^.]+$/, "");
      a.download = `${base}-converted.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast({ title: "Converted!", description: `Saved as ${ext.toUpperCase()}` });
      setTimeout(() => setProgress(0), 2000);
    };
  };

  return (
    <div className="max-w-lg mx-auto" style={{ minHeight: "100vh", background: "hsl(218,50%,7%)" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b px-4 h-14 flex items-center gap-3"
        style={{ background: "rgba(15,20,38,0.92)", borderColor: "hsl(218,38%,15%)" }}>
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/watermark")}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft size={18} style={{ color: "hsl(43,25%,78%)" }} />
        </button>
        <div>
          <h1 className="text-sm font-bold" style={{ color: "hsl(43,25%,88%)" }}>Video Converter</h1>
          <p className="text-xs text-muted-foreground">Convert to a compatible format</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
          style={{ background: "rgba(212,160,32,0.08)", border: "1px solid rgba(212,160,32,0.2)" }}>
          <Film size={15} style={{ color: "hsl(43,82%,55%)", flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: "hsl(43,20%,72%)" }}>
            This tool converts videos to a browser-compatible format (WebM/MP4) so they can be used in the Watermark Tool.
          </p>
        </div>

        {!videoSrc ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all active:scale-[0.99]"
            style={{ border: "2px dashed rgba(212,160,32,0.25)", background: "rgba(212,160,32,0.03)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.2)" }}>
              <Upload size={26} style={{ color: "hsl(43,82%,58%)" }} />
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: "hsl(43,25%,88%)" }}>Upload Video to Convert</p>
              <p className="text-sm text-muted-foreground mt-1">MOV, AVI, MKV, MP4, WebM, etc.</p>
            </div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border" style={{ background: "#000", borderColor: "hsl(218,38%,18%)" }}>
              <video ref={videoRef} src={videoSrc} className="w-full block" controls playsInline
                onError={() => setError("Could not decode this video. The browser may not support this codec.")} />
              {converting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
                  style={{ background: "rgba(0,0,0,0.8)" }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: "hsl(43,82%,60%)" }} />
                  <p className="text-white font-bold text-sm">Converting… {Math.round(progress)}%</p>
                  <div className="w-52 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: "linear-gradient(90deg,hsl(43,82%,50%),hsl(43,90%,65%))" }} />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(212,160,32,0.7)" }}>Keep screen open</p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setVideoSrc(null); setFileName(""); setError(""); setProgress(0); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X size={12} /> Remove video
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl p-3"
            style={{ background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.25)" }}>
            <AlertCircle size={14} style={{ color: "#e05555", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "#e05555" }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleConvert}
          disabled={!videoSrc || converting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,hsl(43,82%,48%),hsl(43,90%,60%))", color: "hsl(218,50%,8%)" }}>
          {converting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {converting ? `Converting… ${Math.round(progress)}%` : "Convert & Download"}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          After converting, upload the new file to the Watermark Tool.
        </p>
      </div>
    </div>
  );
}
