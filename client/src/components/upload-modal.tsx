import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  onClose: () => void;
  teamId: string;
}

export default function UploadModal({ onClose, teamId }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bpm, setBpm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/tracks", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({ title: "Upload successful!", description: "Your track has been uploaded." });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (allowedTypes.includes(selectedFile.type) || selectedFile.name.match(/\.(mp3|wav|ogg)$/i)) {
      setFile(selectedFile);
    } else {
      toast({ 
        title: "Invalid file type", 
        description: "Please select an MP3, WAV, or OGG file.",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({ 
        title: "No file selected", 
        description: "Please select an audio file to upload.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("duration", "180"); // Default duration, would be calculated from file in real implementation
    
    if (bpm) {
      formData.append("bpm", bpm);
    }

    uploadMutation.mutate(formData);
  };

  return (
    <div className="modal-backdrop">
      <div className="window modal-window" style={{ width: "500px" }}>
        <div className="title-bar">
          <div className="title-bar-text">Upload New Track</div>
          <div className="title-bar-controls">
            <div className="title-bar-button" onClick={onClose}>×</div>
          </div>
        </div>
        
        <div className="window-body">
          <form onSubmit={handleSubmit}>
            <div 
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📁</div>
              <div><strong>
                {file ? file.name : "Click to select audio file or drag and drop"}
              </strong></div>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                Supported formats: MP3, WAV, OGG (Max 50MB)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,audio/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    handleFileSelect(selectedFile);
                  }
                }}
              />
            </div>

            <div className="field-row">
              <label htmlFor="bpm">BPM (optional):</label>
              <input
                type="number"
                id="bpm"
                className="textbox"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="Enter BPM (e.g., 120)"
                min="1"
                max="300"
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
              Leave empty if unknown. This enables beat grid overlay.
            </div>

            <div className="field-row" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button 
                type="submit" 
                className="btn"
                disabled={uploadMutation.isPending || !file}
              >
                {uploadMutation.isPending ? "Uploading..." : "📤 Upload Track"}
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
