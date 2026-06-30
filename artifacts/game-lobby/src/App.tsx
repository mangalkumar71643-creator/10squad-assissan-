import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/Lobby";
import Matchmaking from "@/pages/Matchmaking";
import CharacterSelect from "@/pages/CharacterSelect";
import WeaponSelect from "@/pages/WeaponSelect";
import LoadingScreen from "@/components/LoadingScreen";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/lobby" />} />
      <Route path="/lobby" component={Lobby} />
      <Route path="/matchmaking" component={Matchmaking} />
      <Route path="/character" component={CharacterSelect} />
      <Route path="/weapon" component={WeaponSelect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="dark" style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}>
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
