import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Playlist } from "@shared/schema";

interface SaveTrackDialogProps {
  trackId: string;
  onClose: () => void;
}

export default function SaveTrackDialog({ trackId, onClose }: SaveTrackDialogProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's playlists
  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  // Create new playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string): Promise<Playlist> => {
      const response = await apiRequest("POST", "/api/playlists", { name });
      const data = await response.json();
      return data as Playlist;
    },
    onSuccess: (newPlaylist: Playlist) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setIsCreatingNew(false);
      setNewPlaylistName("");
      setSelectedPlaylistId(newPlaylist.id);
      toast({
        title: "Playlist created",
        description: `Created "${newPlaylist.name}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create playlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save track to playlist mutation
  const saveTrackMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await apiRequest("POST", `/api/playlists/${playlistId}/tracks`, { trackId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Track saved!",
        description: "Track added to playlist",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to save track",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylistMutation.mutate(newPlaylistName.trim());
    }
  };

  const handleSave = () => {
    if (selectedPlaylistId) {
      saveTrackMutation.mutate(selectedPlaylistId);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        className="window"
        style={{
          width: '400px',
          maxHeight: '500px',
          background: '#C0C0C0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="title-bar">
          <div className="title-bar-text">Save Track</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>

        {/* Window Body */}
        <div className="window-body" style={{ padding: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Loading playlists...
            </div>
          ) : (
            <>
              {/* File tree area */}
              <div 
                style={{
                  background: 'white',
                  border: '2px inset #DFDFDF',
                  height: '250px',
                  overflow: 'auto',
                  padding: '4px',
                  marginBottom: '16px',
                }}
              >
                {/* Root folder */}
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ 
                    fontFamily: 'MS Sans Serif, sans-serif',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    📁 My Playlists
                  </span>
                  
                  {/* Playlist folders */}
                  <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                    {playlists.map((playlist) => (
                      <div 
                        key={playlist.id}
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                        style={{
                          padding: '2px 4px',
                          cursor: 'pointer',
                          background: selectedPlaylistId === playlist.id ? '#000080' : 'transparent',
                          color: selectedPlaylistId === playlist.id ? 'white' : 'black',
                          fontSize: '11px',
                          fontFamily: 'MS Sans Serif, sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📁 {playlist.name}
                      </div>
                    ))}
                    
                    {/* Create new folder option */}
                    {!isCreatingNew && (
                      <div 
                        onClick={() => setIsCreatingNew(true)}
                        style={{
                          padding: '2px 4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'MS Sans Serif, sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#0000FF',
                          textDecoration: 'underline',
                        }}
                      >
                        📁 Create New Playlist...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* New playlist input */}
              {isCreatingNew && (
                <div style={{ marginBottom: '16px' }}>
                  <div className="field-row">
                    <label style={{ fontSize: '11px' }}>Playlist Name:</label>
                  </div>
                  <div className="field-row">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name..."
                      style={{
                        width: '100%',
                        padding: '2px 4px',
                        border: '2px inset #DFDFDF',
                        background: 'white',
                        fontSize: '11px',
                        fontFamily: 'MS Sans Serif, sans-serif',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreatePlaylist();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="field-row" style={{ marginTop: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewPlaylistName("");
                      }}
                      style={{
                        padding: '4px 16px',
                        fontSize: '11px',
                        fontFamily: 'MS Sans Serif, sans-serif',
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
                      style={{
                        padding: '4px 16px',
                        marginLeft: '8px',
                        fontSize: '11px',
                        fontFamily: 'MS Sans Serif, sans-serif',
                      }}
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="field-row" style={{ justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleSave}
                  disabled={!selectedPlaylistId || saveTrackMutation.isPending}
                  style={{
                    padding: '4px 16px',
                    fontSize: '11px',
                    fontFamily: 'MS Sans Serif, sans-serif',
                  }}
                >
                  Save
                </button>
                <button 
                  onClick={onClose}
                  style={{
                    padding: '4px 16px',
                    marginLeft: '8px',
                    fontSize: '11px',
                    fontFamily: 'MS Sans Serif, sans-serif',
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}