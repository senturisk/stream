import { StreamDestination, StudioConfig, Scene } from '../types/stream';

const STORAGE_KEYS = {
  DESTINATIONS: 'sen_stream_destinations_v1',
  STUDIO_CONFIG: 'sen_stream_studio_config_v1',
  SCENES: 'sen_stream_scenes_v1',
  ACTIVE_SCENE_ID: 'sen_stream_active_scene_v1',
  MODE: 'sen_stream_mode_v1',
};

export const DEFAULT_RESOLUTIONS = [
  { width: 1920, height: 1080, label: '1080p FHD (16:9)', aspect: '16:9' as const },
  { width: 2560, height: 1440, label: '1440p 2K QHD (16:9)', aspect: '16:9' as const },
  { width: 3840, height: 2160, label: '4K UHD (16:9)', aspect: '16:9' as const },
  { width: 1080, height: 1920, label: 'Vertical 9:16 (TikTok/Reels/Shorts)', aspect: '9:16' as const },
  { width: 1280, height: 720, label: '720p HD (Fast)', aspect: '16:9' as const },
];

export const DEFAULT_CONFIG: StudioConfig = {
  resolution: DEFAULT_RESOLUTIONS[0],
  fps: 60,
  bitrateKbps: 6000,
  snapToGrid: true,
  gridSize: 20,
  snapThreshold: 10,
  showGridLines: true,
  audioEchoCancellation: true,
  audioNoiseSuppression: true,
  autoGainControl: true,
  themeColor: 'sapphire',
};

export const DEFAULT_DESTINATIONS: StreamDestination[] = [
  {
    id: 'dest_yt',
    platform: 'youtube',
    name: 'YouTube Live',
    iconName: 'Youtube',
    color: '#FF0000',
    enabled: true,
    serverUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
    latencyMode: 'ultra-low',
  },
  {
    id: 'dest_twitch',
    platform: 'twitch',
    name: 'Twitch',
    iconName: 'Twitch',
    color: '#9146FF',
    enabled: true,
    serverUrl: 'rtmp://live.twitch.tv/app/',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
  },
  {
    id: 'dest_fb',
    platform: 'facebook',
    name: 'Facebook Live',
    iconName: 'Facebook',
    color: '#1877F2',
    enabled: false,
    serverUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
  },
  {
    id: 'dest_insta',
    platform: 'instagram',
    name: 'Instagram Live',
    iconName: 'Instagram',
    color: '#E4405F',
    enabled: false,
    serverUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
  },
  {
    id: 'dest_kick',
    platform: 'kick',
    name: 'Kick',
    iconName: 'Zap',
    color: '#53FC18',
    enabled: false,
    serverUrl: 'rtmps://fa723794b6f0.global-contribute.live-video.net:443/app/',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
  },
  {
    id: 'dest_custom',
    platform: 'custom',
    name: 'Custom RTMP / SRT',
    iconName: 'Radio',
    color: '#00E5FF',
    enabled: false,
    serverUrl: 'rtmp://localhost:1935/live',
    streamKey: '',
    isKeyMasked: true,
    status: 'offline',
    bitrateKbps: 0,
    droppedFrames: 0,
    uptimeSeconds: 0,
  },
];

export const DEFAULT_SCENES: Scene[] = [
  {
    id: 'scene_main',
    name: 'Main Broadcast',
    sources: [
      {
        id: 'source_bg_color',
        name: 'Dark Studio Backdrop',
        type: 'color',
        visible: true,
        locked: true,
        backgroundColor: '#0c0f17',
        transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, zIndex: 0 },
        opacity: 1,
      },
      {
        id: 'source_screen',
        name: 'Screen / Game Capture',
        type: 'display',
        visible: true,
        locked: false,
        transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, zIndex: 1 },
        opacity: 1,
      },
      {
        id: 'source_cam',
        name: 'Facecam Studio',
        type: 'camera',
        visible: true,
        locked: false,
        transform: { x: 1460, y: 720, width: 420, height: 320, rotation: 0, zIndex: 2 },
        opacity: 1,
      },
      {
        id: 'source_lowerthird',
        name: 'Host Name Badge',
        type: 'lowerthird',
        visible: true,
        locked: false,
        badgeTitle: 'LIVE BROADCAST',
        badgeSubtitle: 'Powered by Sen Stream',
        textColor: '#FFFFFF',
        backgroundColor: '#0052cc',
        transform: { x: 40, y: 980, width: 440, height: 64, rotation: 0, zIndex: 3 },
        opacity: 0.95,
      },
    ],
  },
  {
    id: 'scene_chatting',
    name: 'Just Chatting',
    sources: [
      {
        id: 'source_chatting_bg',
        name: 'Background Accent',
        type: 'color',
        visible: true,
        locked: true,
        backgroundColor: '#121622',
        transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, zIndex: 0 },
        opacity: 1,
      },
      {
        id: 'source_chatting_cam',
        name: 'Full Camera',
        type: 'camera',
        visible: true,
        locked: false,
        transform: { x: 80, y: 120, width: 1240, height: 840, rotation: 0, zIndex: 1 },
        opacity: 1,
      },
      {
        id: 'source_chatting_box',
        name: 'Live Chat Feed',
        type: 'chat',
        visible: true,
        locked: false,
        backgroundColor: '#1a2030',
        textColor: '#e6edf8',
        transform: { x: 1360, y: 120, width: 480, height: 840, rotation: 0, zIndex: 2 },
        opacity: 0.9,
      },
    ],
  },
  {
    id: 'scene_brb',
    name: 'Be Right Back',
    sources: [
      {
        id: 'source_brb_bg',
        name: 'BRB Gradient Backdrop',
        type: 'color',
        visible: true,
        locked: true,
        backgroundColor: '#0a0d14',
        transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, zIndex: 0 },
        opacity: 1,
      },
      {
        id: 'source_brb_text',
        name: 'BRB Notice',
        type: 'text',
        visible: true,
        locked: false,
        text: 'BE RIGHT BACK',
        fontSize: 72,
        textColor: '#a8c7fa',
        transform: { x: 600, y: 480, width: 720, height: 120, rotation: 0, zIndex: 1 },
        opacity: 1,
      },
    ],
  },
  {
    id: 'scene_starting',
    name: 'Starting Soon',
    sources: [
      {
        id: 'source_starting_bg',
        name: 'Starting Backdrop',
        type: 'color',
        visible: true,
        locked: true,
        backgroundColor: '#05070a',
        transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, zIndex: 0 },
        opacity: 1,
      },
      {
        id: 'source_starting_text',
        name: 'Starting Title',
        type: 'text',
        visible: true,
        locked: false,
        text: 'STREAM STARTING SOON',
        fontSize: 64,
        textColor: '#76d6ff',
        transform: { x: 520, y: 490, width: 880, height: 100, rotation: 0, zIndex: 1 },
        opacity: 1,
      },
    ],
  },
];

export class StorageService {
  static getDestinations(): StreamDestination[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DESTINATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default list in case new platforms were added
        return DEFAULT_DESTINATIONS.map(def => {
          const found = parsed.find((p: StreamDestination) => p.id === def.id || p.platform === def.platform);
          return found ? { ...def, ...found, status: 'offline', uptimeSeconds: 0 } : def;
        });
      }
    } catch (e) {
      console.warn('Failed to load destinations from localStorage:', e);
    }
    return DEFAULT_DESTINATIONS;
  }

  static saveDestinations(destinations: StreamDestination[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(destinations));
    } catch (e) {
      console.error('Failed to save destinations:', e);
    }
  }

  static getStudioConfig(): StudioConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STUDIO_CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load studio config:', e);
    }
    return DEFAULT_CONFIG;
  }

  static saveStudioConfig(config: StudioConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDIO_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save studio config:', e);
    }
  }

  static getScenes(): Scene[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SCENES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load scenes:', e);
    }
    return DEFAULT_SCENES;
  }

  static saveScenes(scenes: Scene[]): void {
    try {
      // Strip transient mediaStream before saving to JSON
      const cleanScenes = scenes.map(sc => ({
        ...sc,
        sources: sc.sources.map(src => {
          const { mediaStream, ...rest } = src;
          return rest;
        })
      }));
      localStorage.setItem(STORAGE_KEYS.SCENES, JSON.stringify(cleanScenes));
    } catch (e) {
      console.error('Failed to save scenes:', e);
    }
  }

  static getActiveSceneId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SCENE_ID) || 'scene_main';
  }

  static saveActiveSceneId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SCENE_ID, id);
  }

  static getAppMode(): 'simple' | 'streamer' {
    const mode = localStorage.getItem(STORAGE_KEYS.MODE);
    return mode === 'simple' ? 'simple' : 'streamer';
  }

  static saveAppMode(mode: 'simple' | 'streamer'): void {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }

  static exportProfile(): string {
    const data = {
      app: 'Sen Stream',
      developer: 'by Senturisk',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      config: this.getStudioConfig(),
      destinations: this.getDestinations(),
      scenes: this.getScenes(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importProfile(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.config) this.saveStudioConfig(data.config);
      if (data.destinations) this.saveDestinations(data.destinations);
      if (data.scenes) this.saveScenes(data.scenes);
      return true;
    } catch (e) {
      console.error('Failed to import profile:', e);
      return false;
    }
  }
}
