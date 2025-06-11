import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/auth";

import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import DashboardPage from "./pages/dashboard";
import PlayerPage from "./pages/player";
import PublicPlayerPage from "./pages/public-player";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

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
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <LandingPage />}
      </Route>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      <Route path="/register">
        {user ? <Redirect to="/dashboard" /> : <RegisterPage />}
      </Route>
      <Route path="/dashboard">
        {user ? <DashboardPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/tracks/:trackId">
        {user ? <PlayerPage /> : <Redirect to="/" />}
      </Route>
      <Route path="/share/:token" component={PublicPlayerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="desktop">
          <Router />
          <Toaster />
          
          {/* Windows 95 Taskbar */}
          <div className="taskbar">
            <div className="start-button">
              <span>🪟 Start</span>
            </div>
            <div className="taskbar-time">
              {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
