import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  CreditCard, 
  Building2, 
  Banknote,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";

interface PaymentInfo {
  price: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isPaystackEnabled: boolean;
  isManualEnabled: boolean;
  paystackPublicKey: string;
  paystackSecretKey: string;
  currencyCode: string;
  currencySymbol: string;
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentInfo>({
    price: 15000,
    bankName: "",
    accountNumber: "",
    accountName: "",
    instructions: "",
    isPaystackEnabled: true,
    isManualEnabled: true,
    paystackPublicKey: "",
    paystackSecretKey: "",
    currencyCode: "NGN",
    currencySymbol: "₦",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-info");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        throw new Error("Failed to load");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not fetch settings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/payment-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "Settings Saved", description: "Payment information updated successfully." });
      } else {
        toast({ variant: "destructive", title: "Save Failed" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {};
  const inputStyle = {};

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Payment Configuration</h1>
          <p className="text-muted-foreground text-sm">Manage how users pay for Premium access.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl h-12 px-8 font-bold gap-2">
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GENERAL SETTINGS */}
        <Card style={cardStyle} className="rounded-3xl border-none shadow-2xl lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Globe className="text-primary" />
              </div>
              <div>
                <CardTitle>Global Payment Settings</CardTitle>
                <CardDescription>Configure currency and pricing across the platform.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">Currency Code (e.g. NGN, USD)</label>
              <Input 
                value={settings.currencyCode} 
                onChange={(e) => setSettings({...settings, currencyCode: e.target.value.toUpperCase()})} 
                style={inputStyle}
                className="h-12 rounded-xl border-none font-bold"
                placeholder="NGN"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">Currency Symbol (e.g. ₦, $)</label>
              <Input 
                value={settings.currencySymbol} 
                onChange={(e) => setSettings({...settings, currencySymbol: e.target.value})} 
                style={inputStyle}
                className="h-12 rounded-xl border-none font-bold"
                placeholder="₦"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">License Price (in Naira, e.g. 15000 = ₦15,000)</label>
              <Input 
                type="number"
                value={settings.price} 
                onChange={(e) => setSettings({...settings, price: parseInt(e.target.value)})} 
                style={inputStyle}
                className="h-12 rounded-xl border-none font-bold"
              />
            </div>
          </CardContent>
        </Card>

        {/* PAYSTACK SETTINGS */}
        <Card style={cardStyle} className="rounded-3xl border-none shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CreditCard className="text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Paystack Integration</CardTitle>
                  <CardDescription>Automated payment processing.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={settings.isPaystackEnabled} 
                onCheckedChange={(val) => setSettings({...settings, isPaystackEnabled: val})} 
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">Public Key</label>
              <Input 
                value={settings.paystackPublicKey} 
                onChange={(e) => setSettings({...settings, paystackPublicKey: e.target.value})} 
                style={inputStyle}
                className="h-12 rounded-xl border-none font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">Secret Key</label>
              <Input 
                type="password"
                value={settings.paystackSecretKey} 
                onChange={(e) => setSettings({...settings, paystackSecretKey: e.target.value})} 
                style={inputStyle}
                className="h-12 rounded-xl border-none font-mono text-xs"
                placeholder="sk_live_••••••••  (leave blank to keep existing)"
              />
              <p className="text-xs text-muted-foreground px-1">Leave blank to keep the existing secret key. Only enter a new value to replace it.</p>
            </div>
          </CardContent>
        </Card>

        {/* MANUAL PAYMENT SETTINGS */}
        <Card style={cardStyle} className="rounded-3xl border-none shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Building2 className="text-blue-500" />
                </div>
                <div>
                  <CardTitle>Manual Bank Transfer</CardTitle>
                  <CardDescription>User transfers and uploads proof.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={settings.isManualEnabled} 
                onCheckedChange={(val) => setSettings({...settings, isManualEnabled: val})} 
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-primary/60 px-1">Bank Name</label>
                <Input value={settings.bankName} onChange={(e) => setSettings({...settings, bankName: e.target.value})} style={inputStyle} className="h-12 rounded-xl border-none font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-primary/60 px-1">Account Number</label>
                <Input value={settings.accountNumber} onChange={(e) => setSettings({...settings, accountNumber: e.target.value})} style={inputStyle} className="h-12 rounded-xl border-none font-mono font-bold tracking-widest" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">Account Name</label>
              <Input value={settings.accountName} onChange={(e) => setSettings({...settings, accountName: e.target.value})} style={inputStyle} className="h-12 rounded-xl border-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary/60 px-1">User Instructions</label>
              <Textarea value={settings.instructions} onChange={(e) => setSettings({...settings, instructions: e.target.value})} style={inputStyle} className="rounded-xl border-none min-h-[100px] resize-none text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
