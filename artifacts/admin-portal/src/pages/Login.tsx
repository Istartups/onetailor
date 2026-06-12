import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        toast({ title: "Login Successful", description: "Welcome back, Admin!" });
        setLocation("/payment-settings");
      } else {
        toast({ variant: "destructive", title: "Login Failed", description: data.message || "Invalid credentials" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to the server" });
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" };
  const inputStyle = { background: "hsl(218,44%,13%)", borderColor: "hsl(218,38%,22%)", color: "hsl(43,25%,88%)" };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden relative z-10" style={cardStyle}>
        <CardHeader className="text-center space-y-4 pt-10 pb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 border border-primary/20">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-serif)" }}>Admin Login</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Manage your OneTailor Toolkit</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-10">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Username</label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="admin" 
                required 
                className="h-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-base"
                style={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary/70 px-1">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                className="h-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-base"
                style={inputStyle}
              />
            </div>
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                Access Dashboard
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
