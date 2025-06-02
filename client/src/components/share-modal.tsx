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
    <div className="modal-backdrop">
      <div className="window modal-window" style={{ width: "450px" }}>
        <div className="title-bar">
          <div className="title-bar-text">Share Track</div>
          <div className="title-bar-controls">
            <div className="title-bar-button" onClick={onClose}>×</div>
          </div>
        </div>
        
        <div className="window-body">
          <div className="field-row">
            <label>Public Share URL:</label>
          </div>
          
          {createShareMutation.isPending ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              Generating share link...
            </div>
          ) : (
            <>
              <div className="share-url" style={{ marginBottom: "10px" }}>
                {shareUrl || "Failed to generate link"}
              </div>
              
              <div className="field-row" style={{ justifyContent: "center" }}>
                <button 
                  className="btn"
                  onClick={copyToClipboard}
                  disabled={!shareUrl}
                >
                  📋 Copy to Clipboard
                </button>
                <button 
                  className="btn"
                  onClick={onClose}
                  style={{ marginLeft: "10px" }}
                >
                  Close
                </button>
              </div>
            </>
          )}
          
          <div style={{ 
            background: "#F0F0F0", 
            padding: "8px", 
            border: "1px inset #C0C0C0", 
            fontSize: "11px",
            marginTop: "15px"
          }}>
            <strong>ℹ️ Note:</strong> Anyone with this link can view and comment on your track without logging in.
          </div>
        </div>
      </div>
    </div>
  );
}
