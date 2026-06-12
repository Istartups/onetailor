import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, RefreshCw, Key, ShieldCheck, Copy, Search, 
  Download, User, Monitor, MoreHorizontal, Send, Trash2, 
  XCircle, CheckCircle2, Building2, Mail, Phone, MessageSquare, Power
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { openWhatsApp, openSMS, openEmail } from "@/lib/utils";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";

interface License {
  id: number;
  key: string;
  status: "active" | "expired" | "suspended" | "revoked";
  customerName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  activationDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export default function LicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLicense, setNewLicense] = useState({
    customerName: "",
    businessName: "",
    email: "",
    phone: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load licenses" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLicense),
      });
      if (res.ok) {
        toast({ title: "License Created", description: "New license generated successfully." });
        setShowCreateDialog(false);
        setNewLicense({ customerName: "", businessName: "", email: "", phone: "" });
        fetchLicenses();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await authFetch(`/api/admin/licenses/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: "Status Updated" });
        fetchLicenses();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleResend = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/licenses/${id}/resend`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Prepare copyable text for manual sending
        const text = `Hello ${data.details.businessName},\n\nYour OneTailor Premium License is ready!\n\nLicense Key: ${data.details.key}\n\nThank you for choosing OneTailor!`;
        navigator.clipboard.writeText(text);
        toast({ title: "Ready to Resend", description: "License details copied to clipboard for manual sending." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const filteredLicenses = licenses.filter(l => 
    l.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardStyle = { background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">License Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and control premium user licenses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLicenses} disabled={loading} className="rounded-xl h-10 gap-2">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="rounded-xl h-10 gap-2">
            <Plus size={16} />
            Generate New
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>All Licenses</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by key, user or business..."
                className="pl-10 rounded-xl bg-muted/20 border-border"
              />
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Business / User</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">License Key</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Activated</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-primary/70 h-14 px-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLicenses.map((l) => (
                <TableRow key={l.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <TableCell className="px-6 py-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm text-foreground">{l.businessName || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><User size={10} /> {l.customerName || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono bg-primary/5 text-primary px-2 py-1 rounded border border-primary/10">{l.key}</code>
                      <button onClick={() => { navigator.clipboard.writeText(l.key); toast({ title: "Copied!" }); }}><Copy size={12} className="text-muted-foreground hover:text-primary" /></button>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <Badge variant={l.status === 'active' ? 'default' : 'secondary'} className="capitalize rounded-full px-3 text-[10px]">
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-xs text-muted-foreground">
                    {l.activationDate ? new Date(l.activationDate).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                        <DropdownMenuItem onClick={() => handleResend(l.id)} className="rounded-lg gap-2 cursor-pointer">
                          <Copy size={14} /> Copy Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (!l.phone) { toast({ title: "No phone number", description: "This license has no phone number on record." }); return; }
                            openWhatsApp(l.phone, `Hello ${l.businessName || l.customerName || "Customer"},\n\nYour OneTailor Premium License is ready!\n\nLicense Key: ${l.key}\n\nThank you for choosing OneTailor!`);
                          }} 
                          className="rounded-lg gap-2 cursor-pointer text-emerald-500"
                        >
                          <MessageSquare size={14} /> Send WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            if (!l.phone) { toast({ title: "No phone number", description: "This license has no phone number on record." }); return; }
                            openSMS(l.phone, `Hello ${l.businessName || l.customerName || "Customer"}, your OneTailor License is: ${l.key}`);
                          }} 
                          className="rounded-lg gap-2 cursor-pointer text-blue-500"
                        >
                          <Send size={14} /> Send SMS
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            if (!l.email) { toast({ title: "No email", description: "This license has no email on record." }); return; }
                            openEmail(l.email, "Your OneTailor License Key", `Hello ${l.businessName || l.customerName || "Customer"},\n\nYour OneTailor Premium License is ready!\n\nLicense Key: ${l.key}\n\nThank you for choosing OneTailor!`);
                          }} 
                          className="rounded-lg gap-2 cursor-pointer text-orange-500"
                        >
                          <Mail size={14} /> Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(l.id, l.status === 'active' ? 'suspended' : 'active')} className="rounded-lg gap-2 cursor-pointer">
                          <Power size={14} /> {l.status === 'active' ? 'Suspend' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(l.id, 'revoked')} className="rounded-lg gap-2 text-red-500 cursor-pointer">
                          <XCircle size={14} /> Revoke License
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New License</DialogTitle>
            <DialogDescription>Manually create a premium license for a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Business Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input placeholder="e.g. Joyful Stitches" value={newLicense.businessName} onChange={e => setNewLicense({...newLicense, businessName: e.target.value})} className="pl-12 h-12 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Customer Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input placeholder="Full Name" value={newLicense.customerName} onChange={e => setNewLicense({...newLicense, customerName: e.target.value})} className="pl-12 h-12 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input type="email" value={newLicense.email} onChange={e => setNewLicense({...newLicense, email: e.target.value})} className="pl-9 h-11 rounded-xl text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input type="tel" value={newLicense.phone} onChange={e => setNewLicense({...newLicense, phone: e.target.value})} className="pl-9 h-11 rounded-xl text-xs" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !newLicense.businessName} className="rounded-xl h-12 flex-1">
              {submitting ? <Loader2 className="animate-spin" /> : "Generate License"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
