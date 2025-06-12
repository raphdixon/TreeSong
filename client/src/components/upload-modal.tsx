import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({ title: "Upload successful!", description: "Your track has been uploaded." });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type and size
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an MP3, WAV, or OGG file.",
        variant: "destructive"
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
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

    // Create audio element to get duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.round(audio.duration);
      
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('duration', duration.toString());
      
      if (bpm.trim()) {
        formData.append('bpm', bpm.trim());
      }
      
      uploadMutation.mutate(formData);
      
      // Clean up
      URL.revokeObjectURL(audio.src);
    });
    
    audio.addEventListener('error', () => {
      toast({
        title: "Invalid audio file",
        description: "Could not read the audio file.",
        variant: "destructive"
      });
      URL.revokeObjectURL(audio.src);
    });
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

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="window" style={{ 
      position: "fixed", 
      top: "50%", 
      left: "50%", 
      transform: "translate(-50%, -50%)",
      zIndex: 1000,
      width: "500px",
      maxWidth: "90vw"
    }}>
      <div className="title-bar">
        <div className="title-bar-text">Upload New Track</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
      
      <div className="window-body" style={{ padding: "20px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
            <div
              className={`sunken-panel ${isDragging ? 'drag-hover' : ''}`}
              style={{
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                border: isDragging ? "2px dashed #0080ff" : "2px dashed #ccc",
                backgroundColor: isDragging ? "#f0f8ff" : "#f9f9f9",
                width: "100%",
                maxWidth: "400px"
              }}
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
          </div>

          <div className="field-row">
            <label htmlFor="bpm">BPM (optional):</label>
            <input
              id="bpm"
              type="number"
              min="60"
              max="200"
              placeholder="Enter BPM (e.g., 120)"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div className="field-row" style={{ justifyContent: "center", marginTop: "20px" }}>
            <button 
              type="submit" 
              disabled={!file || uploadMutation.isPending}
              style={{ marginRight: "10px" }}
            >
              {uploadMutation.isPending ? "Uploading..." : "📤 Upload Track"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}