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
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, XCircle, RefreshCw, Search, ExternalLink, 
  Image as ImageIcon, MoreHorizontal, User, Mail, Phone,
  Banknote, CreditCard, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function Payment() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [currencySettings, setCurrencySettings] = useState({ code: "NGN", symbol: "₦" });
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load payments" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetch("/api/payment-info")
      .then(res => res.json())
      .then(data => {
        if (data.currencyCode && data.currencySymbol) {
          setCurrencySettings({ code: data.currencyCode, symbol: data.currencySymbol });
        }
      });
  }, []);

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this payment and activate the license?")) return;
    try {
      const res = await authFetch(`/api/admin/payments/${id}/approve`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Approved", description: "Payment approved and license generated." });
        fetchPayments();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason) return;
    try {
      const res = await authFetch(`/api/admin/payments/${selectedPayment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        toast({ title: "Rejected", description: "Payment has been rejected." });
        setShowRejectDialog(false);
        setRejectReason("");
        fetchPayments();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const filteredPayments = payments.filter(p => 
    p.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: currencySettings.code,
      maximumFractionDigits: 0,
    }).format(p).replace(currencySettings.code, currencySettings.symbol);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Payment Management</h1>
          <p className="text-muted-foreground text-sm">Review transactions and approve manual payments.</p>
        </div>
        <Button variant="outline" onClick={fetchPayments} disabled={loading} className="rounded-xl gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

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
                      {p.method === 'paystack' ? <CreditCard size={14} className="text-emerald-500" /> : <Banknote size={14} className="text-blue-500" />}
                      <span className="capitalize">{p.method}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 font-black text-primary">{formatPrice(p.amount)}</TableCell>
                  <TableCell className="px-6 py-5">
                    <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground">
                      {p.reference || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <Badge variant={p.status === 'success' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize rounded-full px-3">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                        {p.evidenceUrl && (
                          <DropdownMenuItem onClick={() => window.open(p.evidenceUrl?.replace('/uploads/', '/api/uploads/'), '_blank')} className="rounded-lg gap-2 cursor-pointer">
                            <ImageIcon size={14} /> View Evidence
                          </DropdownMenuItem>
                        )}
                        {p.status === 'pending' && p.method === 'manual' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(p.id)} className="rounded-lg gap-2 text-emerald-500 cursor-pointer">
                              <CheckCircle2 size={14} /> Approve & Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedPayment(p); setShowRejectDialog(true); }} className="rounded-lg gap-2 text-red-500 cursor-pointer">
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
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No transactions found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this payment. The user will see this note.</DialogDescription>
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
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason} className="rounded-xl h-12 flex-1">Reject Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
