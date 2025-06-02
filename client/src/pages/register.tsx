import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import Windows95Layout from "@/components/windows95-layout";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
    }
  }, []);

  // Validate invite token if present
  const { data: inviteData } = useQuery({
    queryKey: [`/api/invite/accept/${inviteToken}`],
    enabled: !!inviteToken,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; teamId?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.user);
      toast({ title: "Welcome!", description: "Your account has been created successfully." });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({ 
        title: "Registration failed", 
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      const registrationData: any = { email, password };
      if (inviteData?.invite?.teamId) {
        registrationData.teamId = inviteData.invite.teamId;
      }
      registerMutation.mutate(registrationData);
    }
  };

  return (
    <Windows95Layout>
      <div className="window" style={{ 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)",
        width: "450px"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">WaveCollab - Register</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>
        
        <div className="window-body">
          {inviteData?.invite && (
            <div style={{ 
              background: "#FFFFCC", 
              border: "1px solid #CCCC99", 
              padding: "8px", 
              marginBottom: "12px",
              fontSize: "11px"
            }}>
              <strong>🎵 Team Invitation</strong><br />
              You've been invited to join a music collaboration team!<br />
              Email: <strong>{inviteData.invite.email}</strong>
            </div>
          )}
          
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
                placeholder="Choose a password (min 6 chars)"
                required
                minLength={6}
                style={{ flex: 1 }}
              />
            </div>
            
            <div className="field-row" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button 
                type="submit" 
                className="btn"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Register"}
              </button>
              
              <button
                type="button"
                className="btn"
                onClick={() => setLocation("/login")}
                style={{ marginLeft: "10px" }}
              >
                Back to Login
              </button>
            </div>
            
            <div className="field-row" style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "11px", textAlign: "center", width: "100%" }}>
                By registering, you'll be able to upload tracks and collaborate with your team.
              </p>
            </div>
          </form>
        </div>
      </div>
    </Windows95Layout>
  );
}
