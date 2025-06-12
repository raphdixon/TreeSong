declare global {
  interface Window {
    WaveSurfer: any;
  }
}

let waveSurferLoaded = false;

export function initializeWaveSurfer(container: HTMLElement, audioUrl: string) {
  if (!waveSurferLoaded) {
    return loadWaveSurfer().then(() => createWaveSurfer(container, audioUrl));
  }
  
  return Promise.resolve(createWaveSurfer(container, audioUrl));
}

function loadWaveSurfer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.WaveSurfer) {
      waveSurferLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/wavesurfer.js@6.6.4/dist/wavesurfer.min.js';
    script.onload = () => {
      console.log('WaveSurfer.js loaded successfully');
      waveSurferLoaded = true;
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load WaveSurfer.js');
      reject(new Error('Failed to load WaveSurfer.js'));
    };
    document.head.appendChild(script);
  });
}

function createWaveSurfer(container: HTMLElement, audioUrl: string) {
  if (!window.WaveSurfer) {
    throw new Error('WaveSurfer not loaded');
  }

  const WaveSurfer = window.WaveSurfer;
  
  const waveSurfer = WaveSurfer.create({
    container,
    waveColor: '#4a90e2',
    progressColor: '#1e3a8a',
    cursorColor: '#ff0000',
    barWidth: 2,
    barRadius: 1,
    responsive: true,
    height: 100,
    normalize: true,
    backend: 'WebAudio',
    mediaControls: false,
    interact: true,
    scrollParent: true,
    minPxPerSec: 50, // Minimum pixels per second for zoom
    pixelRatio: window.devicePixelRatio || 1
  });

  waveSurfer.load(audioUrl);
  
  return waveSurfer;
}
