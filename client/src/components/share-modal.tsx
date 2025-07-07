import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  trackId: string;
  onClose: () => void;
}

export default function ShareModal({ trackId, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const { toast } = useToast();

  const createShareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tracks/${trackId}/share`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create share link", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Copied!", description: "Share link copied to clipboard." });
    } catch (error) {
      toast({ 
        title: "Copy failed", 
        description: "Please manually copy the link.",
        variant: "destructive"
      });
    }
  };

  // Generate share link on modal open
  useEffect(() => {
    createShareMutation.mutate();
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(128, 128, 128, 0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div className="window" style={{ 
        width: "420px",
        maxWidth: "90vw",
        fontFamily: "MS Sans Serif, sans-serif",
        fontSize: "11px"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">Share Track</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>
        
        <div className="window-body" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontWeight: "normal" }}>Public Share URL:</label>
          </div>
          
          {createShareMutation.isPending ? (
            <div style={{ 
              padding: "20px", 
              textAlign: "center",
              backgroundColor: "#c0c0c0",
              border: "2px inset #c0c0c0",
              marginBottom: "16px"
            }}>
              Generating share link...
            </div>
          ) : (
            <>
              <div style={{ 
                backgroundColor: "#ffffff",
                border: "2px inset #c0c0c0",
                padding: "4px 8px",
                marginBottom: "16px",
                fontFamily: "monospace",
                fontSize: "10px",
                wordBreak: "break-all",
                minHeight: "20px"
              }}>
                {shareUrl || "Failed to generate link"}
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                gap: "8px"
              }}>
                <button 
                  onClick={copyToClipboard}
                  disabled={!shareUrl}
                  style={{ 
                    padding: "4px 16px",
                    minWidth: "90px"
                  }}
                >
                  Copy Link
                </button>
                <button 
                  onClick={onClose}
                  style={{ 
                    padding: "4px 16px",
                    minWidth: "60px"
                  }}
                >
                  Close
                </button>
              </div>
            </>
          )}
          
          <div style={{ 
            backgroundColor: "#f0f0f0", 
            padding: "8px", 
            border: "2px inset #c0c0c0", 
            fontSize: "10px",
            marginTop: "16px",
            color: "#666"
          }}>
            <strong>ℹ️ Note:</strong> Anyone with this link can view and comment on your track without logging in.
          </div>
        </div>
      </div>
    </div>
  );
}
