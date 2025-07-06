import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Windows95Layout from "@/components/windows95-layout";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      // Redirect to Replit Auth instead of JWT login
      window.location.href = "/api/login";
      return {};
    },
    onSuccess: (data) => {
      // Redirect to Replit Auth login
      window.location.href = "/api/login";
    },
    onError: (error: any) => {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <Windows95Layout>
      <div className="window" style={{ 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)",
        width: "400px"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - Login</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>
        
        <div className="window-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                className="textbox"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{ flex: 1 }}
              />
            </div>
            
            <div className="field-row">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                className="textbox"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ flex: 1 }}
              />
            </div>
            
            <div className="field-row" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button 
                type="submit" 
                className="btn"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </button>
              
              <button
                type="button"
                className="btn"
                onClick={() => setLocation("/register")}
                style={{ marginLeft: "10px" }}
              >
                Register
              </button>
            </div>
            
            <div className="field-row" style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "11px", textAlign: "center", width: "100%" }}>
                Enter any email and password to create an account
              </p>
            </div>
          </form>
        </div>
      </div>
    </Windows95Layout>
  );
}
