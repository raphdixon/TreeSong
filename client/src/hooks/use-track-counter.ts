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
      console.log('[TRACK_COUNTER] New session initialized:', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Load current count
    const storedCount = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
    setTracksViewed(storedCount);
    console.log('[TRACK_COUNTER] Session loaded with tracks viewed:', storedCount);
  }, []);

  const incrementTrackCount = (trackId: string) => {
    const newCount = tracksViewed + 1;
    setTracksViewed(newCount);
    sessionStorage.setItem(STORAGE_KEY, newCount.toString());
    console.log(`[TRACK_COUNTER] Track viewed: ${trackId}, Total: ${newCount}/${TRACKS_BEFORE_AUTH}`);
    
    if (newCount === TRACKS_BEFORE_AUTH) {
      console.log('[TRACK_COUNTER] Auth prompt threshold reached!');
    }
  };

  const resetTrackCount = () => {
    setTracksViewed(0);
    sessionStorage.setItem(STORAGE_KEY, '0');
    console.log('[TRACK_COUNTER] Track count reset');
  };

  const shouldShowAuthPrompt = (index: number): boolean => {
    // Show auth prompt after every TRACKS_BEFORE_AUTH tracks
    // For example, at indices 4, 9, 14, etc.
    const position = index + 1;
    const shouldShow = position > TRACKS_BEFORE_AUTH && 
                      (position - TRACKS_BEFORE_AUTH - 1) % (TRACKS_BEFORE_AUTH + 1) === 0;
    
    if (shouldShow) {
      console.log(`[TRACK_COUNTER] Auth prompt should show at index ${index}`);
    }
    
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