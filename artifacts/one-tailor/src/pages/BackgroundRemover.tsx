import { useState, useRef, useEffect } from "react";
import { 
  ImageIcon, 
  Upload, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Crown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Settings2
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { ModelManager, type ModelType } from "@/lib/model-manager";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ShareSheet from "@/components/shared/ShareSheet";

export default function BackgroundRemover() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const mediaWorkspace = useAppStore((s) => s.mediaWorkspace);
  const setMediaWorkspace = useAppStore((s) => s.setMediaWorkspace);
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelType, setModelType] = useState<ModelType>('tiny');
  const [cachedModels, setCachedModels] = useState<Record<ModelType, boolean>>({
    tiny: false,
    pro: false
  });
  const [showDownloadNotice, setShowDownloadNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const modelManager = ModelManager.getInstance();

  useEffect(() => {
    checkModelStatus();
    if (mediaWorkspace && mediaWorkspace.type === "image") {
      setImage(mediaWorkspace.url);
    }
  }, []);

  const checkModelStatus = async () => {
    try {
      const tinyCached = await modelManager.checkCache('tiny');
      setCachedModels({ tiny: tinyCached, pro: tinyCached });
    } catch (e) {
      console.error('Cache check failed:', e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!image) return;

    if (!cachedModels.tiny) {
      setShowDownloadNotice(true);
      return;
    }

    startProcessing();
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    try {
      const result = await modelManager.removeBackground(image!, 'tiny');
      if (!result) throw new Error("Failed to process image. Try a smaller file.");
      setProcessedImage(result);
      await incrementUsage();
      toast({
        title: "Success",
        description: "Background removed successfully!",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadModel = async () => {
    setShowDownloadNotice(false);
    setIsDownloading(true);
    setDownloadProgress(0);
    setModelError(null);

    try {
      // Clear cache if previously failed to ensure clean slate
      if (modelError) {
        await modelManager.clearCache();
      }
      
      await modelManager.loadModel('tiny', (progress) => {
        setDownloadProgress(progress);
      });
      setCachedModels({ tiny: true, pro: true });
      toast({
        title: "Model Installed",
        description: `AI model installed. Works offline.`,
      });
      if (image) {
        startProcessing();
      }
    } catch (error: any) {
      console.error('Model download error:', error);
      
      // Provide more helpful context for the unauthorized error
      let message = error.message || "Failed to download AI model. Please check your connection.";
      if (message.includes('Unauthorized') || message.includes('401')) {
        message = "Model access issue. This usually happens with strict firewall/network settings. Please try on a different connection (e.g. mobile data).";
      }
      
      setModelError(message);
      toast({
        title: "Download Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRetry = async () => {
    // Force clear everything before retry
    try {
      await modelManager.clearCache();
      if ('indexedDB' in window) {
        await new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase('transformers-cache');
          req.onsuccess = resolve;
          req.onerror = reject;
        });
      }
    } catch (e) { 
      console.error('Cache/DB clear failed', e); 
    }
    
    // Slight delay before re-initiating download
    setTimeout(() => {
      handleDownloadModel();
    }, 500);
  };

  const handleSaveToDevice = () => {
    if (!processedImage) return;
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = `bg-removed.png`;
    link.click();
    toast({ title: "Saved!", description: "Image saved to your device." });
  };

  const handleOpenInTool = async (path: string) => {
    if (!processedImage) return;
    const response = await fetch(processedImage);
    const blob = await response.blob();
    const file = new File([blob], "bg-removed.png", { type: "image/png" });
    
    setMediaWorkspace({
      id: Math.random().toString(36).substring(7),
      file,
      type: "image",
      url: processedImage,
      createdAt: new Date().toISOString()
    });
    
    window.location.hash = path;
  };

  const modelInfo = modelManager.getModelInfo(modelType);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      <PageHeader title="Background Remover" subtitle="AI Powered" backPath="/all-tools" />

      {!isPremium && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
          <Crown size={20} className="text-primary shrink-0" />
          <p className="text-xs font-bold text-primary flex-1">Premium users get access to High-Definition AI models!</p>
          <button onClick={() => window.location.hash = "/pre-unlock"} className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">⭐ Unlock Premium</button>
        </div>
      )}

      <div className="space-y-4 mt-4">
        {/* AI Status Banner */}
        <div className={cn(
          "p-3 rounded-2xl border flex items-center gap-3 transition-all",
          cachedModels.tiny
            ? "bg-green-500/10 border-green-500/20 text-green-500" 
            : "bg-amber-500/10 border-amber-500/20 text-amber-500"
        )}>
          {cachedModels.tiny ? <ShieldCheck size={18} /> : <Info size={18} />}
          <p className="text-xs font-medium">
            {cachedModels.tiny 
              ? `AI model installed. Works offline.` 
              : `One-time model download required (~176MB).`}
          </p>
        </div>

        {/* Main Work Area */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="aspect-video max-h-[300px] bg-muted/30 relative group">
            {image || processedImage ? (
              <img 
                src={processedImage || image!} 
                alt="Preview" 
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <p className="font-bold text-foreground text-sm">Upload Image</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tap to select a photo</p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="font-bold text-sm">Removing background...</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">This takes a few seconds</p>
              </div>
            )}
          </div>

          <div className="p-3 flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            {!processedImage ? (
              <Button 
                className="flex-1 py-6 rounded-2xl font-bold gap-2"
                disabled={!image || isProcessing || isDownloading}
                onClick={handleProcess}
              >
                <Zap size={18} />
                Remove Background
              </Button>
            ) : (
              <div className="flex-1 space-y-4">
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 text-center">Continue Editing</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleOpenInTool("/compressor")}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                    >
                      <Zap size={14} /> Compress Image
                    </button>
                    <button 
                      onClick={() => handleOpenInTool("/watermark")}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                    >
                      <Settings2 size={14} /> Add Watermark
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <ShareSheet
                      onDownload={handleSaveToDevice}
                      getFile={async () => {
                        const response = await fetch(processedImage);
                        const blob = await response.blob();
                        return new File([blob], "bg-removed.png", { type: "image/png" });
                      }}
                      shareTitle="Background Removed"
                    />
                  </div>
                  <Button 
                    variant="outline"
                    className="w-14 h-14 rounded-2xl p-0"
                    onClick={() => { setImage(null); setProcessedImage(null); }}
                  >
                    <Trash2 size={18} className="text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download Notice Overlay */}
        {showDownloadNotice && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Download size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Download AI Model?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This feature requires a one-time AI model download (<strong>~176MB</strong>). 
                  Once downloaded, background removal works completely offline.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button className="w-full py-6 rounded-2xl font-bold" onClick={handleDownloadModel}>
                  Download & Continue
                </Button>
                <Button variant="ghost" className="w-full py-6" onClick={() => setShowDownloadNotice(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Download Progress Overlay */}
        {isDownloading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Installing AI Model</h3>
                <p className="text-sm text-muted-foreground">
                  Downloading model weights. Please keep the app open.
                </p>
              </div>
              <div className="space-y-3">
                <Progress value={downloadProgress} className="h-3 rounded-full" />
                <p className="text-xs font-bold text-primary">{Math.round(downloadProgress)}% Complete</p>
              </div>
            </div>
          </div>
        )}

        {/* Download Error Overlay */}
        {modelError && !isDownloading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-card border border-destructive/20 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Download Failed</h3>
                <p className="text-sm text-muted-foreground">
                  {modelError}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="w-full py-6 rounded-2xl font-bold" onClick={handleRetry}>
                  Retry Download
                </Button>
                <Button variant="ghost" className="w-full py-6" onClick={() => setModelError(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
