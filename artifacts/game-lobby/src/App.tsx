import { useEffect, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoadingScreen from "@/pages/LoadingScreen";
import Lobby from "@/pages/Lobby";
import Matchmaking from "@/pages/Matchmaking";
import CharacterSelect from "@/pages/CharacterSelect";
import WeaponSelect from "@/pages/WeaponSelect";
import { isAuthenticated } from "@/lib/auth";

export const queryClient = new QueryClient();

// Redirects to the loading/login screen if there's no session — the player
// can't reach any game screen without logging in (Guest/Email/Facebook).
function RequireAuth({ component: Component }: { component: ComponentType }) {
  const [, setLocation] = useLocation();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) setLocation("/", { replace: true });
  }, [authed, setLocation]);

  if (!authed) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoadingScreen} />
      <Route path="/lobby" component={() => <RequireAuth component={Lobby} />} />
      <Route path="/matchmaking" component={() => <RequireAuth component={Matchmaking} />} />
      <Route path="/character" component={() => <RequireAuth component={CharacterSelect} />} />
      <Route path="/weapon" component={() => <RequireAuth component={WeaponSelect} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="dark">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
