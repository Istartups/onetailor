import React, { useEffect, useState } from "react";
import { Users, TrendingUp, UserCheck, Gift, Crown, RefreshCw, Share2, Award } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface ReferralSummary {
  totalReferrals: number;
  referredUsers: number;
  activeReferrers: number;
  convertedUsers: number;
  conversionRate: number;
}

interface TopInviter {
  id: number;
  businessName: string | null;
  email: string | null;
  referralCode: string | null;
  successfulInvites: number;
  referralRewardLevel: number;
  isPremium: boolean;
  createdAt: string;
}

interface TierEntry {
  tier: number;
  count: number;
}

interface DailyEntry {
  name: string;
  count: number;
}

interface ReferralData {
  summary: ReferralSummary;
  topInviters: TopInviter[];
  tierBreakdown: TierEntry[];
  dailyReferred: DailyEntry[];
}

const TIER_INFO: Record<number, { label: string; reward: string; color: string }> = {
  0: { label: "No Tier",  reward: "—",                    color: "text-muted-foreground" },
  1: { label: "Tier 1",   reward: "+5 Bonus Credits",      color: "text-blue-400" },
  2: { label: "Tier 2",   reward: "7 Days Premium",        color: "text-purple-400" },
  3: { label: "Tier 3",   reward: "30 Days Premium",       color: "text-amber-400" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent ? `${accent}18` : "hsl(var(--muted))" }}
      >
        <Icon size={18} style={{ color: accent || "var(--muted-foreground)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-black mt-0.5" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function ReferralAnalytics() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/referral-stats");
      if (!res.ok) throw new Error("Failed to load referral stats");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const gold = "hsl(43,82%,55%)";
  const maxDaily = data ? Math.max(...data.dailyReferred.map((d) => Number(d.count)), 1) : 1;
  const maxInvites = data?.topInviters[0]?.successfulInvites || 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Share2 size={20} style={{ color: gold }} />
            Referral Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track invite performance, conversion rates, and top referrers</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400">{error}</div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading referral data…
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Gift}      label="Total Referrals"   value={data.summary.totalReferrals}  sub="All-time invites"            accent={gold} />
            <StatCard icon={Users}     label="Referred Users"    value={data.summary.referredUsers}   sub="Joined via invite link"      accent="hsl(200,80%,55%)" />
            <StatCard icon={TrendingUp} label="Conversion Rate"  value={`${data.summary.conversionRate}%`} sub={`${data.summary.convertedUsers} converted`} accent="hsl(142,70%,45%)" />
            <StatCard icon={UserCheck} label="Active Referrers"  value={data.summary.activeReferrers} sub="Users who invited others"     accent="hsl(270,70%,65%)" />
          </div>

          {/* Referral Growth + Tier Breakdown side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Referred Growth */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Referred Signups — Last 7 Days</h2>
              <div className="space-y-3">
                {data.dailyReferred.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span style={{ color: gold }}>{Number(d.count)}</span>
                    </div>
                    <MiniBar value={Number(d.count)} max={maxDaily} color={gold} />
                  </div>
                ))}
                {data.dailyReferred.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No referred signups in the last 7 days</p>
                )}
              </div>
            </div>

            {/* Reward Tier Breakdown */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Reward Tier Distribution</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((tier) => {
                  const entry = data.tierBreakdown.find((t) => Number(t.tier) === tier);
                  const count = Number(entry?.count || 0);
                  const info = TIER_INFO[tier];
                  const maxTier = Math.max(...data.tierBreakdown.map((t) => Number(t.count)), 1);
                  return (
                    <div key={tier} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <Award size={13} className={info.color} />
                          <span>{info.label}</span>
                          <span className="text-muted-foreground font-normal">— {info.reward}</span>
                        </div>
                        <span className={info.color}>{count} users</span>
                      </div>
                      <MiniBar value={count} max={maxTier} color={tier === 1 ? "#60a5fa" : tier === 2 ? "#a78bfa" : gold} />
                    </div>
                  );
                })}
                {data.tierBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No users have reached reward tiers yet</p>
                )}
              </div>

              {/* Conversion funnel summary */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 text-center gap-2">
                <div>
                  <p className="text-lg font-black" style={{ color: gold }}>{data.summary.referredUsers}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Referred</p>
                </div>
                <div>
                  <p className="text-lg font-black text-green-400">{data.summary.convertedUsers}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Converted</p>
                </div>
                <div>
                  <p className="text-lg font-black text-blue-400">{data.summary.conversionRate}%</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Inviters Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Crown size={16} style={{ color: gold }} />
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Top Inviters</h2>
            </div>

            {data.topInviters.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No users have made successful referrals yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="text-left px-5 py-3">#</th>
                      <th className="text-left px-4 py-3">Business / Email</th>
                      <th className="text-left px-4 py-3">Referral Code</th>
                      <th className="text-center px-4 py-3">Invites</th>
                      <th className="text-center px-4 py-3">Tier</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3 pr-5">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topInviters.map((u, idx) => {
                      const tier = TIER_INFO[u.referralRewardLevel ?? 0] || TIER_INFO[0];
                      return (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5 font-black text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold truncate max-w-[160px]">
                              {u.businessName || u.email || `User #${u.id}`}
                            </p>
                            {u.email && u.businessName && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <code className="text-xs bg-muted px-2 py-1 rounded-lg font-mono">
                              {u.referralCode || "—"}
                            </code>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-black text-lg" style={{ color: gold }}>
                              {u.successfulInvites}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {u.isPremium ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                <Crown size={10} /> Premium
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Free</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 pr-5 min-w-[120px]">
                            <MiniBar value={u.successfulInvites} max={maxInvites} color={gold} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
