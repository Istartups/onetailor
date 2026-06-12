import { useEffect, useState } from "react";
import { Users, Crown, Clock, AlertCircle, CheckCircle, XCircle, Search, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface AccountRecord {
  id: number;
  email: string | null;
  businessName: string | null;
  phone: string | null;
  isPremium: boolean;
  status: string;
  accountStatus: string;
  premiumRequestStatus: string | null;
  latestPaymentStatus: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  premiumExpiryDate: string | null;
  profile: {
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  "Premium Active":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "Payment Submitted":  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "Payment Approved":   "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "Payment Rejected":   "bg-red-500/10 text-red-400 border border-red-500/20",
  "Pending Payment":    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "Lead":               "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  "Suspended":          "bg-red-500/10 text-red-400 border border-red-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  "Premium Active":    Crown,
  "Payment Submitted": Clock,
  "Pending Payment":   Clock,
  "Payment Rejected":  XCircle,
  "Lead":              Users,
  "Suspended":         AlertCircle,
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-slate-500/10 text-slate-400";
  const Icon = STATUS_ICONS[status] || CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${style}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error("Accounts fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const uniqueStatuses = ["all", ...Array.from(new Set(accounts.map(a => a.accountStatus)))];

  const filtered = accounts.filter(acc => {
    const matchSearch =
      !search ||
      acc.email?.toLowerCase().includes(search.toLowerCase()) ||
      acc.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      acc.phone?.includes(search);
    const matchFilter = filter === "all" || acc.accountStatus === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: accounts.length,
    premium: accounts.filter(a => a.isPremium).length,
    pendingPayment: accounts.filter(a => a.premiumRequestStatus === "payment_submitted").length,
    leads: accounts.filter(a => a.accountStatus === "Lead").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registered premium accounts and conversion pipeline</p>
        </div>
        <button
          onClick={fetchAccounts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Accounts", value: stats.total, icon: Users, color: "text-blue-400" },
          { label: "Premium Active", value: stats.premium, icon: Crown, color: "text-emerald-400" },
          { label: "Pending Review", value: stats.pendingPayment, icon: Clock, color: "text-amber-400" },
          { label: "Leads", value: stats.leads, icon: AlertCircle, color: "text-slate-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, business name, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {uniqueStatuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading accounts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <Users size={40} className="mx-auto opacity-30" />
            <p className="font-medium">{search || filter !== "all" ? "No accounts match your filter" : "No registered accounts yet"}</p>
            <p className="text-sm opacity-60">Accounts appear when users create a premium account</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Business</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Location</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Joined</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(acc => (
                  <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold">{acc.businessName || acc.profile?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">ID #{acc.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{acc.email || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{acc.phone || "—"}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {[acc.profile?.city, acc.profile?.state, acc.profile?.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={acc.accountStatus} />
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(acc.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {acc.lastLoginAt
                        ? new Date(acc.lastLoginAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} of {accounts.length} accounts shown
      </p>
    </div>
  );
}
