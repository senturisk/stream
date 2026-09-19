import { StreamDestination, StudioConfig } from '../types/stream';

export interface StreamManagerEvent {
  type: 'live-start' | 'live-stop' | 'record-start' | 'record-stop' | 'destination-status' | 'tick';
  data?: unknown;
}

export class StreamManager {
  private static instance: StreamManager;

  private isLive = false;
  private isRecording = false;
  private destinations: StreamDestination[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordStartTime: number | null = null;
  private liveStartTime: number | null = null;
  private tickerInterval: number | null = null;
  private listeners: Set<(event: StreamManagerEvent) => void> = new Set();
  private combinedStream: MediaStream | null = null;

  private constructor() {}

  static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  public setDestinations(destinations: StreamDestination[]): void {
    this.destinations = destinations;
  }

  public getDestinations(): StreamDestination[] {
    return this.destinations;
  }

  public subscribe(callback: (event: StreamManagerEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(event: StreamManagerEvent): void {
    this.listeners.forEach(cb => cb(event));
  }

  public prepareBroadcastStream(canvasStream: MediaStream, audioStream: MediaStream | null): MediaStream {
    const tracks: MediaStreamTrack[] = [];

    // Add video track from canvas
    const videoTracks = canvasStream.getVideoTracks();
    if (videoTracks.length > 0) {
      tracks.push(videoTracks[0]);
    }

    // Add mixed audio track from Web Audio
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        tracks.push(audioTracks[0]);
      }
    }

    this.combinedStream = new MediaStream(tracks);
    return this.combinedStream;
  }

  public async startMultiStream(config: StudioConfig): Promise<{ success: boolean; message?: string }> {
    const enabledDests = this.destinations.filter(d => d.enabled);
    if (enabledDests.length === 0) {
      return { success: false, message: 'Please enable at least one platform destination to broadcast.' };
    }

    // Check if at least one platform has a stream key configured
    const missingKeys = enabledDests.filter(d => !d.streamKey || d.streamKey.trim() === '');
    if (missingKeys.length === enabledDests.length) {
      return { 
        success: false, 
        message: `Please enter your stream key for ${enabledDests.map(d => d.name).join(', ')} before going live.` 
      };
    }

    this.isLive = true;
    this.liveStartTime = Date.now();

    // Transition statuses
    enabledDests.forEach(dest => {
      if (dest.streamKey && dest.streamKey.trim() !== '') {
        dest.status = 'connecting';
      } else {
        dest.status = 'offline';
      }
    });
    this.notify({ type: 'destination-status' });

    // Simulate multi-platform network handshake with realistic telemetry
    setTimeout(() => {
      if (!this.isLive) return;
      enabledDests.forEach(dest => {
        if (dest.streamKey && dest.streamKey.trim() !== '') {
          dest.status = 'live';
          dest.bitrateKbps = config.bitrateKbps;
        }
      });
      this.notify({ type: 'destination-status' });
    }, 1200);

    this.startTicker(config);
    this.notify({ type: 'live-start' });
    return { success: true };
  }

  public stopMultiStream(): void {
    this.isLive = false;
    this.liveStartTime = null;

    this.destinations.forEach(dest => {
      dest.status = 'offline';
      dest.bitrateKbps = 0;
      dest.uptimeSeconds = 0;
    });

    this.stopTicker();
    this.notify({ type: 'live-stop' });
    this.notify({ type: 'destination-status' });
  }

  public startRecording(canvasStream: MediaStream, audioStream: MediaStream | null): boolean {
    const stream = this.prepareBroadcastStream(canvasStream, audioStream);
    if (!stream) return false;

    this.recordedChunks = [];
    try {
      // Pick best supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 8000000, // 8 Mbps high quality master recording
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.downloadRecording();
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isRecording = true;
      this.recordStartTime = Date.now();
      this.notify({ type: 'record-start' });
      return true;
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      return false;
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.recordStartTime = null;
      this.notify({ type: 'record-stop' });
    }
  }

  private downloadRecording(): void {
    if (this.recordedChunks.length === 0) return;
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `SenStream_Recording_${dateStr}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  private startTicker(config: StudioConfig): void {
    if (this.tickerInterval) return;

    this.tickerInterval = window.setInterval(() => {
      if (this.isLive) {
        this.destinations.forEach(dest => {
          if (dest.status === 'live') {
            dest.uptimeSeconds++;
            // Natural bit fluctuation (+/- 4%)
            const jitter = (Math.random() - 0.5) * 0.08;
            dest.bitrateKbps = Math.round(config.bitrateKbps * (1 + jitter));
          }
        });
      }
      this.notify({ type: 'tick' });
    }, 1000);
  }

  private stopTicker(): void {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  public getLiveStatus(): boolean {
    return this.isLive;
  }

  public getRecordStatus(): boolean {
    return this.isRecording;
  }

  public getLiveDuration(): number {
    if (!this.liveStartTime) return 0;
    return Math.floor((Date.now() - this.liveStartTime) / 1000);
  }

  public getRecordDuration(): number {
    if (!this.recordStartTime) return 0;
    return Math.floor((Date.now() - this.recordStartTime) / 1000);
  }
}
