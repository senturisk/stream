export type StreamPlatformId = 'youtube' | 'twitch' | 'facebook' | 'instagram' | 'kick' | 'custom';

export interface StreamDestination {
  id: string;
  platform: StreamPlatformId;
  name: string;
  iconName: string;
  color: string;
  enabled: boolean;
  serverUrl: string;
  streamKey: string;
  isKeyMasked: boolean;
  status: 'offline' | 'connecting' | 'live' | 'error';
  bitrateKbps: number;
  droppedFrames: number;
  uptimeSeconds: number;
  latencyMode?: 'ultra-low' | 'low' | 'normal';
}

export type SourceType = 
  | 'display' 
  | 'camera' 
  | 'text' 
  | 'image' 
  | 'lowerthird' 
  | 'chat' 
  | 'color';

export interface SourceTransform {
  x: number; // canvas coordinates (0 to canvasWidth)
  y: number; // canvas coordinates (0 to canvasHeight)
  width: number;
  height: number;
  rotation: number; // in degrees
  zIndex: number;
}

export interface StreamSource {
  id: string;
  name: string;
  type: SourceType;
  visible: boolean;
  locked: boolean;
  transform: SourceTransform;
  opacity: number; // 0 to 1
  mediaStream?: MediaStream;
  // Specific properties
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  badgeTitle?: string;
  badgeSubtitle?: string;
  aspectRatioLocked?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  sources: StreamSource[];
}

export type CanvasResolution = {
  width: number;
  height: number;
  label: string;
  aspect: '16:9' | '9:16' | '4:3' | '21:9';
};

export type TargetFPS = 30 | 60 | 120;

export interface StudioConfig {
  resolution: CanvasResolution;
  fps: TargetFPS;
  bitrateKbps: number;
  snapToGrid: boolean;
  gridSize: number; // 8, 16, 32
  snapThreshold: number; // pixels
  showGridLines: boolean;
  audioEchoCancellation: boolean;
  audioNoiseSuppression: boolean;
  autoGainControl: boolean;
  themeColor: 'sapphire' | 'emerald' | 'violet' | 'coral' | 'amber';
}

export interface AudioTrackInfo {
  id: string;
  name: string;
  type: 'mic' | 'desktop' | 'media' | 'master';
  volume: number; // 0 to 1.5
  muted: boolean;
  levelDb: number; // -60 to 0 dBFS
  peakDb: number;
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  color: string;
}

export interface CompositorMetrics {
  currentFps: number;
  renderTimeMs: number;
  droppedFrames: number;
  totalFrames: number;
  outputBitrate: number;
}
