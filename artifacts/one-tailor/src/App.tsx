import { Suspense, lazy, useEffect, useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/useAppStore";
import AppShell from "@/components/layout/AppShell";
import SplashScreen from "@/components/SplashScreen";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useSearch } from "@/hooks/use-search";

const Home                        = lazy(() => import("@/pages/Home"));
const AllTools                    = lazy(() => import("@/pages/AllTools"));
const Converter                   = lazy(() => import("@/pages/Converter"));
const Profit                      = lazy(() => import("@/pages/Profit"));
const PreUnlock                   = lazy(() => import("@/pages/PreUnlock"));
const PremiumDetails              = lazy(() => import("@/pages/PremiumDetails"));
const PremiumActivated            = lazy(() => import("@/pages/PremiumActivated"));
const PaymentMethod               = lazy(() => import("@/pages/PaymentMethod"));
const AccountLogin                = lazy(() => import("@/pages/AccountLogin"));
const ResetPassword               = lazy(() => import("@/pages/ResetPassword"));
const Settings                    = lazy(() => import("@/pages/Settings"));
const FabricCost                  = lazy(() => import("@/pages/FabricCost"));
const DeliveryDateCalculator      = lazy(() => import("@/pages/DeliveryDateCalculator"));
const MeasurementChecker          = lazy(() => import("@/pages/MeasurementChecker"));
const FabricRequirementCalculator = lazy(() => import("@/pages/FabricRequirementCalculator"));
const GarmentPricingAdvisor       = lazy(() => import("@/pages/GarmentPricingAdvisor"));
const CustomerMeasurement         = lazy(() => import("@/pages/CustomerMeasurement"));
const MeasurementTemplates        = lazy(() => import("@/pages/MeasurementTemplates"));
const MeasurementCardGenerator    = lazy(() => import("@/pages/MeasurementCardGenerator"));
const FabricColorMatcher          = lazy(() => import("@/pages/FabricColorMatcher"));
const InviteTailors               = lazy(() => import("@/pages/InviteTailors"));
const Account                     = lazy(() => import("@/pages/Account"));
const TailorNotes                 = lazy(() => import("@/pages/TailorNotes"));
const NotFound                    = lazy(() => import("@/pages/not-found"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "hsl(43,82%,55%)", borderTopColor: "transparent" }} />
    </div>
  );
}

function AllToolsWithQuery() {
  const [location] = useLocation();
  const [search] = useSearch();
  return <AllTools key={location + search} />;
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/"><Redirect to="/home" /></Route>
        <Route path="/home"               component={Home} />
        <Route path="/all-tools"          component={AllToolsWithQuery} />
        <Route path="/converter"          component={Converter} />
        <Route path="/profit"             component={Profit} />
        <Route path="/pre-unlock"         component={PreUnlock} />
        <Route path="/pre-unlock/:sub"    component={PreUnlock} />
        <Route path="/premium"            component={PremiumDetails} />
        <Route path="/premium-details"    component={PremiumDetails} />
        <Route path="/premium-activated"  component={PremiumActivated} />
        <Route path="/payment-method"     component={PaymentMethod} />
        <Route path="/account-login"      component={AccountLogin} />
        <Route path="/reset-password"     component={ResetPassword} />
        <Route path="/fabric-cost"        component={FabricCost} />
        <Route path="/settings"           component={Settings} />
        <Route path="/delivery-date"      component={DeliveryDateCalculator} />
        <Route path="/measurement-checker"  component={MeasurementChecker} />
        <Route path="/fabric-requirement"   component={FabricRequirementCalculator} />
        <Route path="/price-smartly"      component={GarmentPricingAdvisor} />
        <Route path="/customer-measurement"  component={CustomerMeasurement} />
        <Route path="/measurement-templates" component={MeasurementTemplates} />
        <Route path="/measurement-card"   component={MeasurementCardGenerator} />
        <Route path="/color-matcher"      component={FabricColorMatcher} />
        <Route path="/invite"             component={InviteTailors} />
        <Route path="/account"            component={Account} />
        <Route path="/notes"              component={TailorNotes} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const darkMode       = useAppStore((s) => s.darkMode);
  const appName        = useAppStore((s) => s.appName);
  const setSystemSettings = useAppStore((s) => s.setSystemSettings);
  const setCurrency    = useAppStore((s) => s.setCurrency);
  const setUsage       = useAppStore((s) => s.setUsage);
  const deviceId       = useAppStore((s) => s.deviceId);
  const revalidatePremium = useAppStore((s) => s.revalidatePremium);
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  // On startup: re-validate account session from JWT if one is stored.
  // This restores premium silently on every app open — no manual login needed.
  useEffect(() => {
    revalidatePremium();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = deviceId ? `/api/payment-info?deviceId=${deviceId}` : "/api/payment-info";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        setSystemSettings({
          measurementLimit: data.measurementLimit,
          proUpgradeMessage: data.proUpgradeMessage,
          proUpgradeLink: data.proUpgradeLink,
          proUpgradeButtonText: data.proUpgradeButtonText,
        });
        if (data.currencySymbol && data.currencyCode) {
          setCurrency(data.currencySymbol, data.currencyCode);
        }
        if (data.user) {
          setUsage(data.user.totalUsageCount, data.globalUsageLimit);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, [setSystemSettings, setCurrency, setUsage, deviceId]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    if (appName) document.title = appName;
  }, [appName]);

  return (
    <TooltipProvider>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <PWAInstallPrompt />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppShell>
          <Router />
        </AppShell>
        <Toaster />
      </WouterRouter>
    </TooltipProvider>
  );
}

export default App;
