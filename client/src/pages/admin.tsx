import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Windows95Layout from "@/components/windows95-layout";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tracks" | "users">("tracks");
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.email !== "me@raph.plus")) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, user, setLocation, toast]);

  // Fetch all tracks
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["/api/admin/tracks"],
    enabled: isAuthenticated && user?.email === "me@raph.plus",
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.email === "me@raph.plus",
  });

  // Update track mutation
  const updateTrackMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/admin/tracks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track updated successfully" });
      setEditingTrack(null);
    },
    onError: () => {
      toast({ title: "Failed to update track", variant: "destructive" });
    }
  });

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/tracks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete track", variant: "destructive" });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Windows95Layout>
        <div className="window" style={{ width: '300px', margin: 'auto', marginTop: '100px' }}>
          <div className="title-bar">
            <div className="title-bar-text">Admin Panel</div>
          </div>
          <div className="window-body" style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading...</p>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  return (
    <Windows95Layout>
      <div className="window" style={{ width: '90%', maxWidth: '1200px', margin: '20px auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote Admin Panel</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={() => setLocation("/")}></button>
          </div>
        </div>

        <div className="window-body" style={{ padding: '12px', height: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {/* Admin Header */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>System Administration</h2>
            <button 
              className="btn" 
              onClick={() => setLocation("/")}
              style={{ fontSize: "11px", padding: "2px 8px" }}
            >
              ← Back to Feed
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
            <button
              className={`btn ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
              style={{ 
                fontSize: '11px', 
                padding: '4px 12px',
                background: activeTab === 'tracks' ? '#000080' : '#C0C0C0',
                color: activeTab === 'tracks' ? '#FFFFFF' : '#000000'
              }}
            >
              Tracks ({tracks.length})
            </button>
            <button
              className={`btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
              style={{ 
                fontSize: '11px', 
                padding: '4px 12px',
                background: activeTab === 'users' ? '#000080' : '#C0C0C0',
                color: activeTab === 'users' ? '#FFFFFF' : '#000000'
              }}
            >
              Users ({users.length})
            </button>
          </div>

          {/* Tracks Tab */}
          {activeTab === 'tracks' && (
            <div style={{ background: '#FFFFFF', border: '2px inset #C0C0C0', padding: '8px' }}>
              {tracksLoading ? (
                <p>Loading tracks...</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#C0C0C0', textAlign: 'left' }}>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>ID</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Title</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Artist</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Duration</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Upload Date</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Reactions</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tracks as any[]).map((track) => (
                      <tr key={track.id}>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0', fontFamily: 'monospace', fontSize: '10px' }}>
                          {track.id.substring(0, 8)}...
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {editingTrack === track.id ? (
                            <input
                              type="text"
                              defaultValue={track.originalName}
                              onBlur={(e) => {
                                updateTrackMutation.mutate({
                                  id: track.id,
                                  updates: { originalName: e.target.value }
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTrackMutation.mutate({
                                    id: track.id,
                                    updates: { originalName: e.currentTarget.value }
                                  });
                                }
                              }}
                              style={{ width: '100%', fontSize: '11px' }}
                              autoFocus
                            />
                          ) : (
                            <span onClick={() => setEditingTrack(track.id)} style={{ cursor: 'pointer' }}>
                              {track.originalName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {track.creatorArtistName || track.creatorEmail || 'Unknown'}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {formatDuration(track.duration)}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {formatDate(track.uploadDate)}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0', textAlign: 'center' }}>
                          {track.emojiReactionCount || 0}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          <button
                            className="btn"
                            onClick={() => {
                              if (confirm(`Delete "${track.originalName}"?`)) {
                                deleteTrackMutation.mutate(track.id);
                              }
                            }}
                            style={{ fontSize: '10px', padding: '1px 4px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div style={{ background: '#FFFFFF', border: '2px inset #C0C0C0', padding: '8px' }}>
              {usersLoading ? (
                <p>Loading users...</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#C0C0C0', textAlign: 'left' }}>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>ID</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Email</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Artist Name</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Name</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Created</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Tracks</th>
                      <th style={{ padding: '4px', border: '1px solid #808080' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users as any[]).map((user) => (
                      <tr key={user.id}>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0', fontFamily: 'monospace', fontSize: '10px' }}>
                          {user.id}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {editingUser === user.id ? (
                            <input
                              type="text"
                              defaultValue={user.artistName || ''}
                              onBlur={(e) => {
                                updateUserMutation.mutate({
                                  id: user.id,
                                  updates: { artistName: e.target.value }
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateUserMutation.mutate({
                                    id: user.id,
                                    updates: { artistName: e.currentTarget.value }
                                  });
                                }
                              }}
                              style={{ width: '100%', fontSize: '11px' }}
                              autoFocus
                            />
                          ) : (
                            <span onClick={() => setEditingUser(user.id)} style={{ cursor: 'pointer' }}>
                              {user.artistName || '(click to set)'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {user.firstName} {user.lastName}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          {formatDate(user.createdAt)}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0', textAlign: 'center' }}>
                          {user.trackCount || 0}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #C0C0C0' }}>
                          <button
                            className="btn"
                            onClick={() => {
                              if (user.email === "me@raph.plus") {
                                alert("Cannot delete admin account!");
                                return;
                              }
                              if (confirm(`Delete user "${user.email}"?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            style={{ fontSize: '10px', padding: '1px 4px' }}
                            disabled={user.email === "me@raph.plus"}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </Windows95Layout>
  );
}