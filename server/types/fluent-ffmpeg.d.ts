declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    outputOptions(options: string[]): FfmpegCommand;
    on(event: string, callback: Function): FfmpegCommand;
    pipe(): NodeJS.ReadableStream;
  }
  
  interface Ffmpeg {
    (input?: string): FfmpegCommand;
    ffprobe(file: string, callback: (err: any, metadata: any) => void): void;
    setFfmpegPath(path: string): void;
  }
  
  const ffmpeg: Ffmpeg;
  export = ffmpeg;
}

declare module '@ffmpeg-installer/ffmpeg' {
  export const path: string;
  export const version: string;
  export const url: string;
}