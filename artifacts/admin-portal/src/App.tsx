import React from "react";
import { Switch, Route, Redirect, Router } from "wouter";
import Login from "./pages/Login";
import AgentLogin from "./pages/AgentLogin";
import Dashboard from "./pages/Dashboard";
import AgentDashboard from "./pages/AgentDashboard";
import Overview from "./pages/Overview";
import CombinedPayment from "./pages/CombinedPayment";
import Settings from "./pages/Settings";
import LicenseManagement from "./pages/LicenseManagement";
import Broadcast from "./pages/Broadcast";
import DeployGuide from "./pages/DeployGuide";
import Accounts from "./pages/Accounts";
import CRM from "./pages/CRM";
import SystemLogs from "./pages/SystemLogs";
import ReferralAnalytics from "./pages/ReferralAnalytics";
import { Toaster } from "./components/ui/toaster";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AgentRoute({ children }: { children: React.ReactNode }) {
  const agentToken = localStorage.getItem("agent_token");
  const adminToken = localStorage.getItem("admin_token");
  if (!agentToken && !adminToken) return <Redirect to="/agent-login" />;
  return <>{children}</>;
}

function CRMRoute({ children }: { children: React.ReactNode }) {
  const agentToken = localStorage.getItem("agent_token");
  const adminToken = localStorage.getItem("admin_token");
  if (!agentToken && !adminToken) return <Redirect to="/login" />;
  const isAgent = !adminToken && !!agentToken;
  if (isAgent) {
    return <AgentDashboard>{children}</AgentDashboard>;
  }
  return <Dashboard>{children}</Dashboard>;
}

export default function App() {
  const base = (import.meta.env.BASE_URL || "/admin-portal").replace(/\/$/, "");
  return (
    <Router base={base}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/agent-login" component={AgentLogin} />
        <Route path="/">
          <PrivateRoute><Redirect to="/overview" /></PrivateRoute>
        </Route>
        <Route path="/overview">
          <PrivateRoute><Dashboard><Overview /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/accounts">
          <PrivateRoute><Dashboard><Accounts /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/crm">
          <CRMRoute><CRM /></CRMRoute>
        </Route>
        <Route path="/payment">
          <PrivateRoute><Dashboard><CombinedPayment /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/payment-settings">
          <PrivateRoute><Redirect to="/payment" /></PrivateRoute>
        </Route>
        <Route path="/settings">
          <PrivateRoute><Dashboard><Settings /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/licenses">
          <PrivateRoute><Dashboard><LicenseManagement /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/broadcast">
          <PrivateRoute><Dashboard><Broadcast /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/logs">
          <PrivateRoute><Dashboard><SystemLogs /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/referrals">
          <PrivateRoute><Dashboard><ReferralAnalytics /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/deploy-guide">
          <PrivateRoute><Dashboard><DeployGuide /></Dashboard></PrivateRoute>
        </Route>
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-xl text-muted-foreground mb-4">Page Not Found</p>
              <Redirect to="/" />
            </div>
          </div>
        </Route>
      </Switch>
      <Toaster />
    </Router>
  );
}
