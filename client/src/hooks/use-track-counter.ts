import { useEffect, useState } from 'react';

const TRACKS_BEFORE_AUTH = 4;
const STORAGE_KEY = 'tracksViewedInSession';
const SESSION_ID_KEY = 'feedSessionId';

export function useTrackCounter() {
  const [tracksViewed, setTracksViewed] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Initialize or retrieve session
    let currentSessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_ID_KEY, currentSessionId);
      sessionStorage.setItem(STORAGE_KEY, '0');
    }
    setSessionId(currentSessionId);

    // Load current count
    const storedCount = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
    setTracksViewed(storedCount);
  }, []);

  const incrementTrackCount = (trackId: string) => {
    const newCount = tracksViewed + 1;
    setTracksViewed(newCount);
    sessionStorage.setItem(STORAGE_KEY, newCount.toString());
  };

  const resetTrackCount = () => {
    setTracksViewed(0);
    sessionStorage.setItem(STORAGE_KEY, '0');
  };

  const shouldShowAuthPrompt = (index: number): boolean => {
    // Show auth prompt after every TRACKS_BEFORE_AUTH tracks
    // For example, at indices 4, 9, 14, etc.
    const position = index + 1;
    const shouldShow = position > TRACKS_BEFORE_AUTH && 
                      (position - TRACKS_BEFORE_AUTH - 1) % (TRACKS_BEFORE_AUTH + 1) === 0;
    
    return shouldShow;
  };

  return {
    tracksViewed,
    sessionId,
    incrementTrackCount,
    resetTrackCount,
    shouldShowAuthPrompt,
    TRACKS_BEFORE_AUTH
  };
}