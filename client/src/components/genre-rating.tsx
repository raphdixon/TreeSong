import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Genre } from "@shared/schema";

interface GenreRatingProps {
  genres: Genre[];
  onComplete: () => void;
}

export default function GenreRating({ genres, onComplete }: GenreRatingProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rateMutation = useMutation({
    mutationFn: async ({ genreId, rating }: { genreId: string; rating: number }) => {
      const response = await fetch("/api/genres/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreId, rating }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to rate genre");
      }
      
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Failed to save rating",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRating = async (genreId: string, rating: number) => {
    // Update local state
    setRatings({ ...ratings, [genreId]: rating });
    
    // Save rating to server
    try {
      await rateMutation.mutateAsync({ genreId, rating });
      
      // Check if all genres have been rated
      const allRated = genres.every(g => ratings[g.id] || g.id === genreId);
      
      if (allRated) {
        // Invalidate queries and complete
        queryClient.invalidateQueries({ queryKey: ['/api/genres/unrated'] });
        queryClient.invalidateQueries({ queryKey: ['/api/genres/rated-all'] });
        
        // Small delay before completing to show the last rating
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    } catch (error) {
      console.error("Failed to save rating:", error);
    }
  };

  const currentGenre = genres[currentIndex];
  if (!currentGenre) return null;

  return (
    <div className="window" style={{
      width: "100%",
      maxWidth: "500px",
      margin: "16px auto",
      fontFamily: "MS Sans Serif, sans-serif",
      fontSize: "11px"
    }}>
      <div className="title-bar">
        <div className="title-bar-text">🎵 Rate Genres</div>
      </div>
      
      <div className="window-body" style={{ padding: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h3 style={{ 
            margin: "0 0 8px 0",
            fontSize: "14px",
            color: "#000080"
          }}>
            How much do you like {currentGenre.name}?
          </h3>
          <div style={{ 
            fontSize: "10px",
            color: "#666"
          }}>
            Rating {currentIndex + 1} of {genres.length}
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          justifyContent: "center",
          gap: "8px",
          marginBottom: "16px"
        }}>
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              onClick={() => handleRating(currentGenre.id, rating)}
              disabled={rateMutation.isPending}
              style={{
                width: "60px",
                height: "60px",
                fontSize: "24px",
                cursor: rateMutation.isPending ? "wait" : "pointer",
                backgroundColor: ratings[currentGenre.id] === rating ? "#000080" : "#C0C0C0",
                color: ratings[currentGenre.id] === rating ? "#ffffff" : "#000000",
                border: "2px solid",
                borderColor: ratings[currentGenre.id] === rating 
                  ? "#000080" 
                  : "#ffffff #808080 #808080 #ffffff",
                fontFamily: "MS Sans Serif, sans-serif"
              }}
            >
              {rating}
            </button>
          ))}
        </div>

        <div style={{ 
          textAlign: "center",
          fontSize: "10px",
          color: "#666"
        }}>
          <div>1 = Not at all | 5 = Love it!</div>
        </div>

        {/* Navigation buttons for multi-genre view */}
        {genres.length > 1 && (
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            marginTop: "16px",
            borderTop: "1px solid #C0C0C0",
            paddingTop: "16px"
          }}>
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              style={{ 
                padding: "4px 16px",
                opacity: currentIndex === 0 ? 0.5 : 1
              }}
            >
              ← Previous
            </button>
            
            <div style={{ 
              display: "flex",
              gap: "4px"
            }}>
              {genres.map((g, i) => (
                <div
                  key={g.id}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: ratings[g.id] 
                      ? "#00FF00" 
                      : i === currentIndex 
                        ? "#000080" 
                        : "#C0C0C0"
                  }}
                />
              ))}
            </div>
            
            <button
              onClick={() => setCurrentIndex(Math.min(genres.length - 1, currentIndex + 1))}
              disabled={currentIndex === genres.length - 1}
              style={{ 
                padding: "4px 16px",
                opacity: currentIndex === genres.length - 1 ? 0.5 : 1
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}