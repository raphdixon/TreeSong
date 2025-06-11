import { useState } from "react";
import { useLocation } from "wouter";
import Windows95Layout from "@/components/windows95-layout";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleRegister = () => {
    setLocation("/register");
  };

  return (
    <Windows95Layout>
      {/* Notepad Window */}
      <div className="window" style={{ 
        position: "absolute",
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -60%)",
        width: "500px",
        height: "300px",
        zIndex: 10
      }}>
        <div className="title-bar">
          <div className="title-bar-text">📝 Notepad - Welcome.txt</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>
        
        <div className="window-body" style={{ 
          height: "calc(100% - 33px)",
          padding: "8px",
          overflow: "auto"
        }}>
          <textarea 
            readOnly
            style={{
              width: "100%",
              height: "100%",
              border: "1px inset #c0c0c0",
              padding: "4px",
              fontFamily: "MS Sans Serif, sans-serif",
              fontSize: "11px",
              backgroundColor: "#ffffff",
              resize: "none",
              outline: "none"
            }}
            value={`Welcome to TreeNote by The Meeting Tree.

TreeNote allows people to comment on audio wave forms at various timestamps, without creating an account. It is perfect for making notes at certain points of a song or podcast.

TreeNote is currently free. It was made by The Meeting Tree, a boutique global sonic house.

Your files will likely be deleted after 10 days, so please make a note of any comments!`}
          />
        </div>
      </div>

      {/* Login Window */}
      <div className="window" style={{ 
        position: "absolute",
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, 20%)",
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
          <form>
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
              />
            </div>
            
            <div className="field-row" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button 
                type="button" 
                className="btn"
                onClick={handleLogin}
              >
                Login
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
    </Windows95Layout>
  );
}