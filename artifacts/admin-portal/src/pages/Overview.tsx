import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  UserPlus, 
  Clock,
  Key,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Sun,
  Moon,
  Calendar,
  Zap,
  ShieldAlert,
  BarChart3
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function Overview() {
  const [timeFilter, setTimeFilter] = useState("today");
  const [currencySymbol, setCurrencySymbol] = useState("₦");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalToolActions: 0,
    totalInvites: 0,
    usersNearLimit: 0,
    globalUsageLimit: 25,
    newUsers: 0,
    activations: 0,
    revenue: { earnings: 0, count: 0 },
    disabledUsers: 0,
    disabledLicenses: 0,
    activationRate: "0%",
    trendData: [],
    recentActivity: []
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("admin_theme");
      if (savedTheme === "dark" || savedTheme === "light") return savedTheme as "light" | "dark";
    }
    return "dark";
  });

  const fetchStats = async () => {
    try {
      const res = await authFetch(`/api/admin/stats?filter=${timeFilter}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetch("/api/payment-info")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch payment info");
        return res.json();
      })
      .then(data => {
        if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
      })
      .catch(err => console.error("Failed to fetch currency", err));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [timeFilter]);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val;
    return currencySymbol + num.toLocaleString();
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
            Overview <span className="gold-shimmer">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">Monitor your sales, activations, and user growth.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 h-11 w-11"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
          </Button>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-primary/20 bg-primary/5 h-11 font-bold text-xs">
              <SelectValue placeholder="Time Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/20">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtered Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Usage Card */}
        <Card className="rounded-3xl border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden group hover:border-primary/40 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/70">
              Total Tool Actions
            </CardDescription>
            <CardTitle className="text-3xl font-black">{stats.totalToolActions.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary text-xs font-bold">
              <Zap className="w-4 h-4" />
              <span>Across {stats.totalUsers} users</span>
            </div>
          </CardContent>
        </Card>

        {/* Community Invites Card */}
        <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">
              Community Growth
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600">{stats.totalInvites.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>Total successful invites</span>
            </div>
          </CardContent>
        </Card>

        {/* Near Limit Card */}
        <Card className="rounded-3xl border-amber-500/20 bg-amber-500/5 backdrop-blur-sm overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-600/70">
              Users Near Limit
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-600">{stats.usersNearLimit}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Within 5 of {stats.globalUsageLimit} limit</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/70">
              {timeFilter === "all-time" ? "Total Earnings" : `${timeFilter.replace("-", " ")} Earnings`}
            </CardDescription>
            <CardTitle className="text-3xl font-black">{formatCurrency(stats.revenue.earnings)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>{stats.revenue.count} sales</span>
            </div>
          </CardContent>
        </Card>

        {/* Users Card */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/70">
              New Users ({timeFilter.replace("-", " ")})
            </CardDescription>
            <CardTitle className="text-3xl font-black">{stats.newUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>{stats.totalUsers} total registered</span>
            </div>
          </CardContent>
        </Card>

        {/* Licenses Card */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/70">
              {timeFilter === "all-time" ? "Total Activations" : `Activations (${timeFilter.replace("-", " ")})`}
            </CardDescription>
            <CardTitle className="text-3xl font-black">{stats.activations}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{stats.activationRate} activation rate</span>
            </div>
          </CardContent>
        </Card>

        {/* Disabled Card */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary/70">
              Disabled ({timeFilter.replace("-", " ")})
            </CardDescription>
            <CardTitle className="text-3xl font-black">{stats.disabledLicenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.disabledUsers} users restricted</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Extra KPIs */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm p-6 md:col-span-2">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg">Useful KPIs</CardTitle>
            <CardDescription>Advanced metrics for lifetime license model.</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            {[
              { label: "Activation Rate", value: stats.activationRate, sub: "Total Generated", icon: CheckCircle2 },
              { label: "Conversion Rate", value: stats.totalUsers ? Math.round((stats.activations / stats.totalUsers) * 100) + "%" : "0%", sub: "Payments → Activations", icon: TrendingUp },
              { label: "Community Shares", value: stats.totalInvites, sub: "Organic Growth", icon: Users },
            ].map((kpi, i) => (
              <div key={i} className="p-4 rounded-2xl bg-primary/5 border border-primary/5 hover:border-primary/20 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-3 h-3 text-primary" />
                  <p className="text-[10px] font-black uppercase text-primary/60">{kpi.label}</p>
                </div>
                <p className="text-xl font-black">{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground font-bold">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <div className="space-y-4 mt-6">
            {stats.recentActivity.length > 0 ? stats.recentActivity.map((activity: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/5 hover:border-primary/20 transition-all duration-200">
                {activity.type === 'check' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {activity.type === 'user' && <UserPlus className="w-4 h-4 text-primary" />}
                {activity.type === 'payment' && <Banknote className="w-4 h-4 text-emerald-500" />}
                <span className="text-sm font-medium">{activity.text}</span>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground text-sm font-medium">No recent activity</div>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl">License Activations</CardTitle>
            <CardDescription>Daily activation trend for the last 7 days</CardDescription>
          </CardHeader>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="colorActivations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderRadius: '12px', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="activations" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorActivations)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-primary/10 bg-card/50 backdrop-blur-sm p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl">Revenue Trend</CardTitle>
            <CardDescription>Earnings growth over time</CardDescription>
          </CardHeader>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderRadius: '12px', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
