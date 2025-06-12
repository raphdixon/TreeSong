import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BPMAnalyzer, type BPMAnalysisProgress, type BPMAnalysisResult } from "@/lib/bpmAnalyzer";

interface UploadModalProps {
  onClose: () => void;
  teamId: string;
}

export default function UploadModal({ onClose, teamId }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bpm, setBpm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<BPMAnalysisProgress | null>(null);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [manualBpm, setManualBpm] = useState(false);
  const [autoBpmEnabled, setAutoBpmEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Starting upload with FormData:", formData);
      
      // Use fetch with explicit credentials and proper headers for FormData
      const response = await fetch("/api/tracks", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      console.log("Upload response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error(`Upload failed: ${errorText}`);
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

  const handleFileSelect = async (selectedFile: File) => {
    // Basic file type validation
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/flac'];
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|ogg|flac)$/i)) {
      toast({ 
        title: "Invalid file type", 
        description: "Please select an MP3, WAV, FLAC, or OGG file.",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setDetectedBpm(null);
    setManualBpm(false);
    setBpm("");
    
    // Validate file for BPM analysis
    const validation = BPMAnalyzer.validateAudioFile(selectedFile);
    if (!validation.valid) {
      toast({
        title: "File Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if auto BPM detection is enabled
    if (!autoBpmEnabled) {
      setManualBpm(true);
      return;
    }

    // Check browser compatibility
    const compatibility = BPMAnalyzer.checkBrowserCompatibility();
    if (!compatibility.supported) {
      toast({
        title: "Browser Not Supported", 
        description: compatibility.error,
        variant: "destructive",
      });
      // Still allow manual BPM entry
      setManualBpm(true);
      return;
    }

    // Start automatic BPM analysis
    try {
      setIsAnalyzing(true);
      const analyzer = new BPMAnalyzer((progress) => {
        setAnalysisProgress(progress);
      });
      
      const result = await analyzer.analyzeFile(selectedFile);
      
      if (result.processed && result.bpm > 0) {
        setDetectedBpm(result.bpm);
        setBpm(result.bpm.toString());
        toast({
          title: "BPM Detected",
          description: `Automatically detected ${result.bpm} BPM`,
        });
      } else {
        setManualBpm(true);
        toast({
          title: "BPM Detection Failed",
          description: "Could not detect BPM automatically. Please enter manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('BPM analysis failed:', error);
      setManualBpm(true);
      toast({
        title: "Analysis Error",
        description: "BPM detection failed. Please enter BPM manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
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

            {/* Auto BPM Detection Checkbox */}
            <div className="field-row">
              <label>
                <input
                  type="checkbox"
                  checked={autoBpmEnabled}
                  onChange={(e) => setAutoBpmEnabled(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Automatic BPM detection
              </label>
            </div>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "-4px", marginBottom: "8px" }}>
              Uncheck to manually enter BPM without automatic analysis
            </div>

            {/* BPM Analysis Progress */}
            {isAnalyzing && analysisProgress && (
              <div className="analysis-progress">
                <div className="progress-header">
                  <span>🎵 Analyzing BPM...</span>
                  <span>{Math.round(analysisProgress.progress)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${analysisProgress.progress}%` }}
                  />
                </div>
                <div className="progress-message">{analysisProgress.message}</div>
              </div>
            )}

            {/* BPM Detection Results */}
            {detectedBpm && !manualBpm && (
              <div className="bpm-detection-result">
                <div className="detection-header">
                  <span>✅ BPM Detected: {detectedBpm}</span>
                  <button 
                    type="button"
                    className="btn-small"
                    onClick={() => setManualBpm(true)}
                  >
                    Manual Override
                  </button>
                </div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  Click "Manual Override" to adjust the detected BPM
                </div>
              </div>
            )}

            {/* Manual BPM Input */}
            {(manualBpm || !detectedBpm) && file && (
              <div className="field-row">
                <label htmlFor="bpm">
                  {detectedBpm ? "Override BPM:" : "BPM (optional):"}
                </label>
                <input
                  type="number"
                  id="bpm"
                  className="textbox"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder={detectedBpm ? detectedBpm.toString() : "Enter BPM (e.g., 120)"}
                  min="1"
                  max="300"
                  style={{ flex: 1 }}
                />
                {detectedBpm && (
                  <button 
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      setBpm(detectedBpm.toString());
                      setManualBpm(false);
                    }}
                  >
                    Use Auto
                  </button>
                )}
              </div>
            )}
            
            {!file && (
              <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                Upload a file to automatically detect BPM or enter manually.
              </div>
            )}

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
