import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InviteModalProps {
  onClose: () => void;
}

export default function InviteModal({ onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/invite", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Invitation sent!", 
        description: `An invitation has been sent to ${email}` 
      });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send invitation", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      inviteMutation.mutate({ email });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="window modal-window">
        <div className="title-bar">
          <div className="title-bar-text">Invite Teammate</div>
          <div className="title-bar-controls">
            <div className="title-bar-button" onClick={onClose}>×</div>
          </div>
        </div>
        
        <div className="window-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="inviteEmail">Email Address:</label>
            </div>
            <div className="field-row">
              <input
                type="email"
                id="inviteEmail"
                className="textbox"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                required
                style={{ width: "100%" }}
              />
            </div>
            
            <div className="field-row">
              <label htmlFor="inviteMessage">Message (optional):</label>
            </div>
            <div className="field-row">
              <textarea
                id="inviteMessage"
                className="textbox"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Join our music collaboration team!"
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            
            <div className="field-row" style={{ justifyContent: "center", marginTop: "15px" }}>
              <button 
                type="submit" 
                className="btn"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "📧 Send Invite"}
              </button>
              <button 
                type="button" 
                className="btn"
                onClick={onClose}
                style={{ marginLeft: "10px" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
