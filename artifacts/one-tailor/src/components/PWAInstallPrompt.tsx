import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast({
        title: "Installing OneTailor",
        description: "The app is being added to your home screen.",
      });
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-80 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border border-primary/20 shadow-2xl rounded-2xl p-4 backdrop-blur-md">
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="text-primary" size={24} />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-bold text-foreground">Install OneTailor</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Install OneTailor for offline use and a faster experience on your home screen.
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={handleInstall}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs rounded-xl"
          >
            Add to Home Screen
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setShowPrompt(false)}
            className="h-9 text-xs rounded-xl text-muted-foreground"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
