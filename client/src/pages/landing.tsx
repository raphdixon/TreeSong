import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Windows95Layout from "@/components/windows95-layout";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notepadOpen, setNotepadOpen] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      loginMutation.mutate({ email, password });
    }
  };

  const handleRegister = () => {
    setLocation("/register");
  };

  return (
    <Windows95Layout>
      {/* Notepad Window */}
      {notepadOpen && (
        <div 
          className="window" 
          style={{ 
            position: "absolute",
            top: "50%", 
            left: "50%", 
            transform: "translate(-50%, -80%)",
            width: "550px",
            height: "320px",
            zIndex: 5
          }}
          onClick={() => {
            // Bring notepad to front when clicked
            const notepad = document.querySelector('[data-notepad]') as HTMLElement;
            if (notepad) {
              notepad.style.zIndex = '15';
            }
          }}
          data-notepad
        >
          <div className="title-bar">
            <div className="title-bar-text">📝 Notepad - DemoTree Welcome.txt</div>
            <div className="title-bar-controls">
              <div className="title-bar-button">_</div>
              <div className="title-bar-button">□</div>
              <div className="title-bar-button" onClick={(e) => {
                e.stopPropagation();
                setNotepadOpen(false);
              }}>×</div>
            </div>
          </div>
          
          <div className="window-body" style={{ 
            height: "calc(100% - 33px)",
            padding: "8px",
            overflow: "auto"
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              border: "1px inset #c0c0c0",
              padding: "8px",
              fontFamily: "MS Sans Serif, sans-serif",
              fontSize: "13px",
              backgroundColor: "#ffffff",
              lineHeight: "1.4"
            }}>
              Welcome to DemoTree by{" "}
              <a 
                href="https://themeetingtree.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: "#0000EE",
                  textDecoration: "underline"
                }}
              >
                The Meeting Tree
              </a>
              .
              <br /><br />
              DemoTree is the perfect platform for sharing your music demos and getting reactions from listeners. Upload your tracks and watch as people respond with emoji reactions placed at specific moments throughout your song.
              <br /><br />
              First-time listeners must complete the full track before they can skip around or add reactions - ensuring your music gets the attention it deserves from start to finish.
              <br /><br />
              DemoTree is currently free. It was made by{" "}
              <a 
                href="https://themeetingtree.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: "#0000EE",
                  textDecoration: "underline"
                }}
              >
                The Meeting Tree
              </a>
              , a boutique global sonic house.
              <br /><br />
              Your audio files will be automatically deleted after 21 days, but emoji reactions and waveform visualizations remain available to track your demo's reception!
            </div>
          </div>
        </div>
      )}

      {/* Login Window */}
      <div 
        className="window" 
        style={{ 
          position: "absolute",
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, 10%)",
          width: "400px",
          zIndex: 10
        }}
        onClick={() => {
          // Bring login to front when clicked
          const login = document.querySelector('[data-login]') as HTMLElement;
          if (login) {
            login.style.zIndex = '15';
          }
          // Put notepad behind
          const notepad = document.querySelector('[data-notepad]') as HTMLElement;
          if (notepad) {
            notepad.style.zIndex = '5';
          }
        }}
        data-login
      >
        <div className="title-bar">
          <div className="title-bar-text">DemoTree - Login</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>
        
        <div className="window-body">
          <form onSubmit={handleLogin}>
            <div className="field-row">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                className="textbox"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{ flex: 1 }}
                required
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
                style={{ flex: 1 }}
                required
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
                onClick={handleRegister}
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

      {/* Desktop Icon to reopen notepad if closed */}
      {!notepadOpen && (
        <div style={{ 
          position: "absolute", 
          top: "20px", 
          left: "20px",
          textAlign: "center", 
          cursor: "pointer",
          width: "64px"
        }}
        onClick={() => setNotepadOpen(true)}
        >
          <div style={{ 
            fontSize: "32px", 
            marginBottom: "4px",
            padding: "8px",
            borderRadius: "2px"
          }}>
            📝
          </div>
          <div style={{ 
            fontSize: "10px", 
            color: "white",
            textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
            wordWrap: "break-word"
          }}>
            Welcome
          </div>
        </div>
      )}
    </Windows95Layout>
  );
}