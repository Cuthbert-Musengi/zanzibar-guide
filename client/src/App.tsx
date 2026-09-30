import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ChatDashboard from "@/pages/ChatDashboard";
import Home from "@/pages/Home";
import Widget from "@/pages/Widget";
import Analytics from "@/pages/Analytics";
import Messaging from "@/pages/Messaging";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import AgentDesk from "@/pages/AgentDesk";
import SharedTrip from "@/pages/SharedTrip";
import CollabTripPage from "@/pages/CollabTripPage";
import FavoritesSharePage from "@/pages/FavoritesSharePage";
import TripComparePage from "@/pages/TripComparePage";
import BookingTrackPage from "@/pages/BookingTrackPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { useEffect } from "react";

function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;
      const onControllerChange = () => {
        if (!hadController) {
          hadController = true;
          return;
        }
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
      return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    }
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={ChatDashboard} />
      <Route path={"/explore"} component={Home} />
      <Route path={"/widget"} component={Widget} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/messaging"} component={Messaging} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/account"} component={Account} />
      <Route path={"/agent"} component={AgentDesk} />
      <Route path={"/bookings/:code"} component={BookingTrackPage} />
      <Route path={"/trip/:id"} component={SharedTrip} />
      <Route path={"/collab/:id"} component={CollabTripPage} />
      <Route path={"/favorites/:id"} component={FavoritesSharePage} />
      <Route path={"/compare-trips"} component={TripComparePage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <LanguageProvider>
          <AccessibilityProvider>
            <CurrencyProvider>
              <TooltipProvider>
                <PwaRegister />
                <Toaster />
                <Router />
              </TooltipProvider>
            </CurrencyProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
