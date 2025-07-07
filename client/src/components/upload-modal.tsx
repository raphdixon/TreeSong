import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Genre } from "@shared/schema";

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch genres
  const { data: genres = [], isLoading: genresLoading } = useQuery({
    queryKey: ['/api/genres']
  });

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({ title: "Upload successful!", description: "Your track has been uploaded." });
      onClose();
      // Navigate to the newly uploaded track
      setLocation(`/tracks/${data.id}`);
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
    // Validate file type and size - MP3 only
    const validTypes = ['audio/mpeg', 'audio/mp3'];
    const isValidExtension = selectedFile.name.toLowerCase().endsWith('.mp3');
    
    if (!validTypes.includes(selectedFile.type) && !isValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please select an MP3 file only.",
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

    if (selectedGenres.length < 2 || selectedGenres.length > 3) {
      toast({
        title: "Genre selection required",
        description: "Please select 2-3 genres for your track.",
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
      formData.append('genres', JSON.stringify(selectedGenres));
      
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
        width: "480px",
        maxWidth: "90vw",
        fontFamily: "MS Sans Serif, sans-serif",
        fontSize: "11px"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">Upload New Track</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>
        
        <div className="window-body" style={{ padding: "16px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px", textAlign: "center" }}>
              <div
                className="sunken-panel"
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "#c0c0c0",
                  border: isDragging ? "2px dashed #000080" : "2px inset #c0c0c0",
                  minHeight: "120px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ 
                  fontSize: "32px", 
                  marginBottom: "8px",
                  filter: "grayscale(1)"
                }}>🎵</div>
                <div style={{ 
                  fontWeight: "bold",
                  marginBottom: "4px",
                  color: "#000"
                }}>
                  {file ? file.name : "Select MP3 file"}
                </div>
                <div style={{ 
                  fontSize: "10px", 
                  color: "#666",
                  textAlign: "center"
                }}>
                  Click here or drag and drop<br/>
                  MP3 files only (Max 50MB)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
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

            {/* Genre Selection */}
            <div style={{ 
              marginTop: "16px",
              marginBottom: "16px",
              padding: "12px",
              border: "1px inset #c0c0c0",
              backgroundColor: "#ffffff"
            }}>
              <div style={{ 
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#000080"
              }}>
                Select 2-3 Genres for Your Track:
              </div>
              
              {genresLoading ? (
                <div>Loading genres...</div>
              ) : (
                <div style={{ 
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  padding: "4px"
                }}>
                  {(genres as Genre[]).map((genre) => (
                    <label
                      key={genre.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        padding: "2px 4px",
                        backgroundColor: selectedGenres.includes(genre.id) ? "#000080" : "transparent",
                        color: selectedGenres.includes(genre.id) ? "#ffffff" : "#000000",
                        userSelect: "none"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedGenres.length < 3) {
                              setSelectedGenres([...selectedGenres, genre.id]);
                            }
                          } else {
                            setSelectedGenres(selectedGenres.filter(id => id !== genre.id));
                          }
                        }}
                        style={{ marginRight: "4px" }}
                      />
                      <span style={{ fontSize: "10px" }}>{genre.name}</span>
                    </label>
                  ))}
                </div>
              )}
              
              <div style={{ 
                marginTop: "8px",
                fontSize: "10px",
                color: "#666666",
                textAlign: "center"
              }}>
                Selected: {selectedGenres.length}/3
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              gap: "8px",
              marginTop: "16px" 
            }}>
              <button 
                type="submit" 
                disabled={!file || uploadMutation.isPending}
                style={{ 
                  padding: "4px 16px",
                  minWidth: "80px"
                }}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </button>
              <button 
                type="button" 
                onClick={onClose}
                style={{ 
                  padding: "4px 16px",
                  minWidth: "80px"
                }}
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