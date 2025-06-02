import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth";

import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import DashboardPage from "./pages/dashboard";
import PlayerPage from "./pages/player";
import PublicPlayerPage from "./pages/public-player";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/tracks/:trackId" component={PlayerPage} />
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
