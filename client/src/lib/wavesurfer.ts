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
    waveColor: '#0000FF',     // Win95 blue bars
    progressColor: '#000080', // Win95 navy blue for progress
    cursorColor: '#FF0000',   // Win95 red cursor
    barWidth: 2,
    barRadius: 0,             // Sharp corners for Win95 look
    responsive: true,
    height: 120,              // Match Win95 height
    normalize: true,
    backend: 'WebAudio',
    mediaControls: false,
    interact: true,
    scrollParent: false,
    minPxPerSec: 50,
    pixelRatio: 1,            // Pixelated for Win95 aesthetic
    fillParent: true
  });

  waveSurfer.load(audioUrl);
  
  return waveSurfer;
}
