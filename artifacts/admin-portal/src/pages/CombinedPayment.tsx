import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, RefreshCw, Search, Image as ImageIcon,
  MoreHorizontal, Banknote, CreditCard, Loader2, Save, Globe,
  Building2, ShieldCheck
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

interface Payment {
  id: number;
  userId: number;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  evidenceUrl?: string;
  adminNotes?: string;
  createdAt: string;
  verifiedAt?: string;
}

interface PaymentSettings {
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
  price2Device: string;
  price3Device: string;
  price5Device: string;
}

function formatPrice(amount: number, symbol: string, code: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: code, maximumFractionDigits: 0,
  }).format(amount).replace(code, symbol);
}

function formatPriceDisplay(val: string | number) {
  const n = Number(val);
  if (!n) return "";
  if (n % 1 === 0) return n.toLocaleString();
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function CombinedPayment() {
  const [tab, setTab] = useState<"overview" | "settings">("overview");
  const { toast } = useToast();

  // ── Overview state ─────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [currency, setCurrency] = useState({ code: "NGN", symbol: "₦" });

  // ── Settings state ─────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<PaymentSettings>({
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
    price2Device: "",
    price3Device: "",
    price5Device: "",
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await authFetch("/api/admin/payments");
      if (res.ok) setPayments(await res.json());
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load payments" });
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/payment-info");
      if (res.ok) {
        const data = await res.json();
        if (data.currencyCode && data.currencySymbol) {
          setCurrency({ code: data.currencyCode, symbol: data.currencySymbol });
        }
        setSettings({
          price: data.price || 15000,
          bankName: data.bankName || "",
          accountNumber: data.accountNumber || "",
          accountName: data.accountName || "",
          instructions: data.instructions || "",
          isPaystackEnabled: data.isPaystackEnabled ?? true,
          isManualEnabled: data.isManualEnabled ?? true,
          paystackPublicKey: data.paystackPublicKey || "",
          paystackSecretKey: "",
          currencyCode: data.currencyCode || "NGN",
          currencySymbol: data.currencySymbol || "₦",
          price2Device: data.price2Device != null ? String(data.price2Device) : "",
          price3Device: data.price3Device != null ? String(data.price3Device) : "",
          price5Device: data.price5Device != null ? String(data.price5Device) : "",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not fetch settings" });
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, []);

  const handleApprove = async (id: number) => {
    if (!confirm("Approve this payment and activate the license?")) return;
    try {
      const res = await authFetch(`/api/admin/payments/${id}/approve`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Approved", description: "Payment approved and license generated." });
        fetchPayments();
      }
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason) return;
    try {
      const res = await authFetch(`/api/admin/payments/${selectedPayment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast({ title: "Rejected", description: "Payment has been rejected." });
        setShowRejectDialog(false);
        setRejectReason("");
        fetchPayments();
      }
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload: any = { ...settings };
      if (!payload.paystackSecretKey) delete payload.paystackSecretKey;
      payload.price2Device = payload.price2Device ? parseInt(payload.price2Device) || 0 : null;
      payload.price3Device = payload.price3Device ? parseInt(payload.price3Device) || 0 : null;
      payload.price5Device = payload.price5Device ? parseInt(payload.price5Device) || 0 : null;

      const res = await authFetch("/api/payment-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "Settings Saved", description: "Payment configuration updated." });
        setSettings((s) => ({ ...s, paystackSecretKey: "" }));
      } else {
        toast({ variant: "destructive", title: "Save Failed" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredPayments = payments.filter((p) =>
    p.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabStyle = (active: boolean) => ({
    padding: "0.625rem 1.25rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s",
    background: active ? "rgba(212,160,32,0.12)" : "transparent",
    color: active ? "hsl(43,82%,55%)" : "var(--muted-foreground)",
    border: active ? "1px solid rgba(212,160,32,0.25)" : "1px solid transparent",
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Payment</h1>
          <p className="text-muted-foreground text-sm">Review transactions and manage payment configuration.</p>
        </div>
        {tab === "overview" && (
          <Button variant="outline" onClick={fetchPayments} disabled={loadingPayments} className="rounded-xl gap-2 w-fit">
            <RefreshCw size={16} className={loadingPayments ? "animate-spin" : ""} />
            Refresh
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
        <button style={tabStyle(tab === "overview")} onClick={() => setTab("overview")}>Overview</button>
        <button style={tabStyle(tab === "settings")} onClick={() => setTab("settings")}>Settings</button>
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <CardTitle>Transactions</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by reference or method..."
                  className="pl-10 rounded-xl bg-muted/20 border-border"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Method</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Amount</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Reference</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Date</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p) => (
                  <TableRow key={p.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {p.method === "paystack" ? <CreditCard size={14} className="text-emerald-500" /> : <Banknote size={14} className="text-blue-500" />}
                        <span className="capitalize">{p.method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 font-black text-primary">
                      {formatPrice(p.amount, currency.symbol, currency.code)}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {p.reference || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Badge
                        variant={p.status === "success" ? "default" : p.status === "pending" ? "secondary" : "destructive"}
                        className="capitalize rounded-full px-3"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                          {p.evidenceUrl && (
                            <DropdownMenuItem
                              onClick={() => window.open(p.evidenceUrl?.replace("/uploads/", "/api/uploads/"), "_blank")}
                              className="rounded-lg gap-2 cursor-pointer"
                            >
                              <ImageIcon size={14} /> View Evidence
                            </DropdownMenuItem>
                          )}
                          {p.status === "pending" && p.method === "manual" && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(p.id)} className="rounded-lg gap-2 text-emerald-500 cursor-pointer">
                                <CheckCircle2 size={14} /> Approve & Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setSelectedPayment(p); setShowRejectDialog(true); }}
                                className="rounded-lg gap-2 text-red-500 cursor-pointer"
                              >
                                <XCircle size={14} /> Reject Payment
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── SETTINGS TAB ───────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        loadingSettings ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-8">

            {/* Global Settings */}
            <Card className="rounded-3xl border-none shadow-2xl bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Globe className="text-primary" size={18} />
                  </div>
                  <div>
                    <CardTitle>Global Payment Settings</CardTitle>
                    <CardDescription>Currency and pricing across the platform.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Currency Code (e.g. NGN, USD)</label>
                  <Input
                    value={settings.currencyCode}
                    onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value.toUpperCase() })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-bold"
                    placeholder="NGN"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Currency Symbol (e.g. ₦, $)</label>
                  <Input
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-bold"
                    placeholder="₦"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Base License Price (whole units, e.g. 15000 = ₦15,000)</label>
                  <Input
                    type="number"
                    value={settings.price}
                    onChange={(e) => setSettings({ ...settings, price: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Device Pricing Tiers */}
            <Card className="rounded-3xl border-none shadow-2xl bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Banknote className="text-blue-400" size={18} />
                  </div>
                  <div>
                    <CardTitle>Device Pricing Tiers</CardTitle>
                    <CardDescription>Set per-device pricing. Leave blank to use the base price.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: "price" as const,        label: "1 Device",   placeholder: "e.g. 15000" },
                  { key: "price2Device" as const,  label: "2 Devices",  placeholder: "e.g. 25000" },
                  { key: "price3Device" as const,  label: "3 Devices",  placeholder: "e.g. 35000" },
                  { key: "price5Device" as const,  label: "5 Devices",  placeholder: "e.g. 50000" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">{label}</label>
                    <Input
                      value={key === "price" ? String(settings.price) : (settings[key] || "")}
                      onChange={(e) =>
                        key === "price"
                          ? setSettings({ ...settings, price: parseInt(e.target.value) || 0 })
                          : setSettings({ ...settings, [key]: e.target.value })
                      }
                      placeholder={placeholder}
                      className="h-11 rounded-xl bg-muted/20 border-border font-bold text-sm"
                    />
                    {key !== "price" && settings[key] && (
                      <p className="text-[10px] text-muted-foreground px-1">
                        {settings.currencySymbol}{formatPriceDisplay(settings[key])}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Paystack */}
            <Card className="rounded-3xl border-none shadow-2xl bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <CreditCard className="text-emerald-500" size={18} />
                    </div>
                    <div>
                      <CardTitle>Paystack Integration</CardTitle>
                      <CardDescription>Automated payment processing.</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.isPaystackEnabled}
                    onCheckedChange={(val) => setSettings({ ...settings, isPaystackEnabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Public Key</label>
                  <Input
                    value={settings.paystackPublicKey}
                    onChange={(e) => setSettings({ ...settings, paystackPublicKey: e.target.value })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-mono text-xs"
                    placeholder="pk_live_..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Secret Key</label>
                  <Input
                    type="password"
                    value={settings.paystackSecretKey}
                    onChange={(e) => setSettings({ ...settings, paystackSecretKey: e.target.value })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-mono text-xs"
                    placeholder="sk_live_•••• (leave blank to keep existing)"
                  />
                  <p className="text-xs text-muted-foreground px-1">Leave blank to keep the existing secret key.</p>
                </div>
              </CardContent>
            </Card>

            {/* Manual Bank Transfer */}
            <Card className="rounded-3xl border-none shadow-2xl bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Building2 className="text-blue-500" size={18} />
                    </div>
                    <div>
                      <CardTitle>Manual Bank Transfer</CardTitle>
                      <CardDescription>User transfers and uploads proof.</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.isManualEnabled}
                    onCheckedChange={(val) => setSettings({ ...settings, isManualEnabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-primary/60 px-1">Bank Name</label>
                    <Input
                      value={settings.bankName}
                      onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20 border-border font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-primary/60 px-1">Account Number</label>
                    <Input
                      value={settings.accountNumber}
                      onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20 border-border font-mono font-bold tracking-widest"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Account Name</label>
                  <Input
                    value={settings.accountName}
                    onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                    className="h-12 rounded-xl bg-muted/20 border-border font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">User Instructions</label>
                  <Textarea
                    value={settings.instructions}
                    onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                    className="rounded-xl bg-muted/20 border-border min-h-[100px] resize-none text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingSettings} className="h-12 px-8 rounded-2xl font-bold gap-2">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                Save Payment Settings
              </Button>
            </div>
          </form>
        )
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment. The user will see this note.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Receipt is unreadable, Amount doesn't match"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="rounded-xl h-12 flex-1">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
