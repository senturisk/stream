import { AudioTrackInfo } from '../types/stream';

export class AudioEngine {
  private static instance: AudioEngine;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  private tracks: Map<string, {
    info: AudioTrackInfo;
    sourceNode?: MediaStreamAudioSourceNode | AudioNode;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  }> = new Map();

  private animationFrameId: number | null = null;
  private onMeterUpdateCallbacks: Set<(tracks: AudioTrackInfo[]) => void> = new Set();

  private constructor() {
    // Lazy init on first user action
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public ensureContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;

      this.masterAnalyser = this.audioContext.createAnalyser();
      this.masterAnalyser.fftSize = 256;
      this.masterAnalyser.smoothingTimeConstant = 0.75;

      this.destinationNode = this.audioContext.createMediaStreamDestination();

      this.masterGain.connect(this.masterAnalyser);
      this.masterGain.connect(this.destinationNode);

      this.startMeterLoop();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  public getOutputMediaStream(): MediaStream | null {
    this.ensureContext();
    return this.destinationNode ? this.destinationNode.stream : null;
  }

  public addTrack(id: string, name: string, type: 'mic' | 'desktop' | 'media', initialVolume = 1.0): void {
    const ctx = this.ensureContext();
    if (this.tracks.has(id)) return;

    const gainNode = ctx.createGain();
    gainNode.gain.value = initialVolume;

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.75;

    gainNode.connect(analyserNode);
    if (this.masterGain) {
      analyserNode.connect(this.masterGain);
    }

    const info: AudioTrackInfo = {
      id,
      name,
      type,
      volume: initialVolume,
      muted: false,
      levelDb: -60,
      peakDb: -60,
    };

    this.tracks.set(id, {
      info,
      gainNode,
      analyserNode,
    });
  }

  public attachMediaStream(trackId: string, stream: MediaStream): void {
    const ctx = this.ensureContext();
    const track = this.tracks.get(trackId);
    if (!track) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      if (track.sourceNode) {
        track.sourceNode.disconnect();
      }
      const sourceNode = ctx.createMediaStreamSource(stream);
      sourceNode.connect(track.gainNode);
      track.sourceNode = sourceNode;
    } catch (e) {
      console.warn('Could not attach stream to audio track:', e);
    }
  }

  public setVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    if (!track) {
      if (id === 'master' && this.masterGain) {
        this.masterGain.gain.value = volume;
      }
      return;
    }
    track.info.volume = volume;
    if (!track.info.muted) {
      track.gainNode.gain.setTargetAtTime(volume, this.audioContext?.currentTime || 0, 0.02);
    }
  }

  public setMute(id: string, muted: boolean): void {
    const track = this.tracks.get(id);
    if (!track) {
      if (id === 'master' && this.masterGain) {
        this.masterGain.gain.value = muted ? 0 : 1;
      }
      return;
    }
    track.info.muted = muted;
    const targetGain = muted ? 0 : track.info.volume;
    track.gainNode.gain.setTargetAtTime(targetGain, this.audioContext?.currentTime || 0, 0.02);
  }

  public removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (!track) return;

    if (track.sourceNode) {
      track.sourceNode.disconnect();
    }
    track.gainNode.disconnect();
    track.analyserNode.disconnect();
    this.tracks.delete(id);
  }

  public subscribeMeters(callback: (tracks: AudioTrackInfo[]) => void): () => void {
    this.onMeterUpdateCallbacks.add(callback);
    return () => {
      this.onMeterUpdateCallbacks.delete(callback);
    };
  }

  private startMeterLoop(): void {
    if (this.animationFrameId) return;

    const dataArray = new Uint8Array(128);

    const checkLevels = () => {
      const results: AudioTrackInfo[] = [];

      this.tracks.forEach((track) => {
        if (track.info.muted) {
          track.info.levelDb = -60;
          track.info.peakDb = -60;
          results.push({ ...track.info });
          return;
        }

        track.analyserNode.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
          const abs = Math.abs(norm);
          if (abs > peak) peak = abs;
        }

        const rms = Math.sqrt(sumSquares / dataArray.length);
        const levelDb = rms > 0.001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;
        const peakDb = peak > 0.001 ? Math.max(-60, Math.min(0, 20 * Math.log10(peak))) : -60;

        track.info.levelDb = levelDb;
        track.info.peakDb = Math.max(peakDb, track.info.peakDb - 1.2); // Smooth decay
        results.push({ ...track.info });
      });

      // Master meter
      if (this.masterAnalyser) {
        this.masterAnalyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
          const abs = Math.abs(norm);
          if (abs > peak) peak = abs;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const levelDb = rms > 0.001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;
        const peakDb = peak > 0.001 ? Math.max(-60, Math.min(0, 20 * Math.log10(peak))) : -60;

        results.push({
          id: 'master',
          name: 'Master Output',
          type: 'master',
          volume: this.masterGain ? this.masterGain.gain.value : 1,
          muted: false,
          levelDb,
          peakDb,
        });
      }

      this.onMeterUpdateCallbacks.forEach(cb => cb(results));
      this.animationFrameId = requestAnimationFrame(checkLevels);
    };

    this.animationFrameId = requestAnimationFrame(checkLevels);
  }

  public cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.tracks.forEach(track => {
      if (track.sourceNode) track.sourceNode.disconnect();
      track.gainNode.disconnect();
      track.analyserNode.disconnect();
    });
    this.tracks.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
