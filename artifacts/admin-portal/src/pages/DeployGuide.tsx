import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Server, 
  Globe, 
  Database, 
  ShieldCheck, 
  Zap, 
  Terminal,
  ExternalLink,
  CheckCircle2,
  Info,
  Cpu,
  Layout,
  Settings,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeployGuide() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("admin_theme");
      if (savedTheme === "dark" || savedTheme === "light") return savedTheme as "light" | "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const cardStyle = { background: "var(--card)", border: "1px solid var(--border)" };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
            Deployment <span className="gold-shimmer">Guide</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Step-by-step instructions for hosting OneTailor Toolkit live.</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 h-11 w-11"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
        </Button>
      </div>

      <Tabs defaultValue="vps" className="w-full">
        <TabsList className="bg-primary/5 border border-primary/10 rounded-2xl p-1 mb-8">
          <TabsTrigger value="vps" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Cpu className="w-4 h-4" /> VPS Hosting
          </TabsTrigger>
          <TabsTrigger value="cpanel" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Layout className="w-4 h-4" /> cPanel
          </TabsTrigger>
          <TabsTrigger value="directadmin" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 font-bold transition-all">
            <Settings className="w-4 h-4" /> DirectAdmin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vps" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VPS Prerequisites */}
            <Card className="rounded-3xl border-border bg-card overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Info className="w-5 h-5" /> VPS Prerequisites
                </CardTitle>
                <CardDescription>What you need before starting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {[
                    "A VPS (Ubuntu 22.04+ recommended)",
                    "Domain Name (e.g., dashboard.onetailor.com)",
                    "Node.js 18+ installed on server",
                    "PM2 for process management"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Server Setup */}
            <Card className="rounded-3xl border-border bg-card overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Server className="w-5 h-5" /> 1. VPS Server Setup
                </CardTitle>
                <CardDescription>Initial environment configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-black/40 font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto">
                  <p># Update system</p>
                  <p>sudo apt update && sudo apt upgrade -y</p>
                  <p># Install Node.js & PM2</p>
                  <p>curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -</p>
                  <p>sudo apt install -y nodejs</p>
                  <p>sudo npm install -g pm2</p>
                </div>
              </CardContent>
            </Card>

            {/* VPS Database & API */}
            <Card className="rounded-3xl border-border bg-card overflow-hidden md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Database className="w-5 h-5" /> 2. VPS Database & API Deployment
                </CardTitle>
                <CardDescription>The API server uses PGLite, so no external Postgres is required!</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground"><Terminal className="w-4 h-4" /> Steps</h3>
                  <ol className="space-y-4 list-decimal list-inside text-sm text-muted-foreground font-medium">
                    <li>Upload the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">api-server</code> folder to your VPS.</li>
                    <li>Run <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">npm install</code> inside the folder.</li>
                    <li>Build the project using <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">npm run build</code>.</li>
                    <li>Start with PM2: <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">pm2 start dist/index.js --name onetailor-api</code>.</li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground"><Zap className="w-4 h-4" /> Key Note</h3>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The system is designed with <strong>Self-Healing Migrations</strong>. On first start, it will automatically create the database and tables needed. No manual SQL scripts are required.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cpanel" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <Card className="rounded-3xl border-border bg-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Layout className="w-5 h-5" /> cPanel Node.js Deployment
              </CardTitle>
              <CardDescription>Deploying on shared hosting with cPanel Node.js Selector</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">1. Prepare Application</h3>
                  <ul className="space-y-3">
                    {[
                      "Build your API server locally: npm run build",
                      "Zip the 'dist', 'package.json', and 'node_modules' folders",
                      "Upload the zip to your cPanel File Manager",
                      "Extract into a new folder (e.g., /api-server)"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">2. Configure Node.js Selector</h3>
                  <ol className="space-y-3 list-decimal list-inside text-sm text-muted-foreground font-medium">
                    <li>Search for "Setup Node.js App" in cPanel.</li>
                    <li>Click "Create Application".</li>
                    <li>Set "Application root" to your folder (e.g., <code className="bg-muted px-1 rounded">api-server</code>).</li>
                    <li>Set "Application startup file" to <code className="bg-muted px-1 rounded">dist/index.js</code>.</li>
                    <li>Set "Application URL" to your desired endpoint (e.g., <code className="bg-muted px-1 rounded">api</code>).</li>
                    <li>Click "Create" and then "Run JS script" to install dependencies if needed.</li>
                  </ol>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400 font-bold">
                  <Info className="w-4 h-4 inline mr-2" />
                  Note: Ensure the 'PORT' environment variable in cPanel matches what the application expects, or let cPanel handle the proxying automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directadmin" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <Card className="rounded-3xl border-border bg-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Settings className="w-5 h-5" /> DirectAdmin Node.js Setup
              </CardTitle>
              <CardDescription>Configuring Node.js applications in DirectAdmin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">1. Application Setup</h3>
                  <ol className="space-y-3 list-decimal list-inside text-sm text-muted-foreground font-medium">
                    <li>Go to "Node.js Setup" in DirectAdmin.</li>
                    <li>Click "Setup New Application".</li>
                    <li>Select Node.js version (18+).</li>
                    <li>Set "App Directory" to your uploaded folder.</li>
                    <li>Set "App Domain" and "App URL".</li>
                    <li>Set "Startup File" to <code className="bg-muted px-1 rounded">dist/index.js</code>.</li>
                  </ol>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">2. Environment Variables</h3>
                  <p className="text-xs text-muted-foreground">Add these variables in the setup screen:</p>
                  <div className="p-3 rounded-xl bg-muted/50 font-mono text-[10px] space-y-1">
                    <p>NODE_ENV = production</p>
                    <p>PORT = 3000</p>
                    <p>API_URL = https://yourdomain.com/api</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Global Config Section */}
      <Card className="rounded-3xl border-border bg-card overflow-hidden md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Globe className="w-5 h-5" /> Live Environment Best Practices
          </CardTitle>
          <CardDescription>Optimizing for stability and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-border space-y-2">
              <h4 className="font-bold text-xs text-foreground">SSL/HTTPS</h4>
              <p className="text-[10px] text-muted-foreground">Always use SSL. On VPS, use Certbot/Let's Encrypt. On Shared Hosting, use the built-in SSL manager.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-border space-y-2">
              <h4 className="font-bold text-xs text-foreground">Correct URLs</h4>
              <p className="text-[10px] text-muted-foreground">Replace all <code className="text-primary">localhost</code> references in your frontend <code className="text-primary">.env</code> files with your actual production domain.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-border space-y-2">
              <h4 className="font-bold text-xs text-foreground">Process Monitoring</h4>
              <p className="text-[10px] text-muted-foreground">Use PM2 on VPS to ensure the API restarts if the server reboots. Use <code className="text-primary">pm2 save</code> after starting.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="font-bold text-sm">Nginx Reverse Proxy (Recommended for VPS)</h4>
            </div>
            <div className="p-4 rounded-xl bg-black/40 font-mono text-[10px] text-primary/80 whitespace-pre overflow-x-auto">
{`location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
