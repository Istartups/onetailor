import React from "react";
import { Switch, Route, Redirect, Router } from "wouter";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import PaymentSettings from "./pages/PaymentSettings";
import LicenseManagement from "./pages/LicenseManagement";
import Broadcast from "./pages/Broadcast";
import DeployGuide from "./pages/DeployGuide";
import Accounts from "./pages/Accounts";
import { Toaster } from "./components/ui/toaster";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Redirect to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const base = (import.meta.env.BASE_URL || "/admin-portal").replace(/\/$/, "");
  return (
    <Router base={base}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <PrivateRoute><Redirect to="/overview" /></PrivateRoute>
        </Route>
        <Route path="/overview">
          <PrivateRoute><Dashboard><Overview /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/accounts">
          <PrivateRoute><Dashboard><Accounts /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/payment">
          <PrivateRoute><Dashboard><Payment /></Dashboard></PrivateRoute>
        </Route>
        <Route path="/payment-settings">
          <PrivateRoute><Dashboard><PaymentSettings /></Dashboard></PrivateRoute>
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
