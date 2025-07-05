import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./hooks/useAuth";

import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import DashboardPage from "./pages/dashboard";
import FeedPage from "./pages/feed";
import ArtistPage from "./pages/artist";
import PlayerPage from "./pages/player";
import PublicPlayerPage from "./pages/public-player";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="window" style={{ width: '300px' }}>
          <div className="title-bar">
            <div className="title-bar-text">TreeNote</div>
          </div>
          <div className="window-body" style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={FeedPage} />
      <Route path="/artist/:username" component={ArtistPage} />
      <Route path="/dashboard">
        {isAuthenticated ? <DashboardPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/tracks/:trackId">
        {isAuthenticated ? <PlayerPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/share/:token" component={PublicPlayerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="desktop">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
