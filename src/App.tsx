import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  StreamDestination, 
  StudioConfig, 
  Scene, 
  StreamSource, 
  CompositorMetrics 
} from './types/stream';
import { StorageService } from './services/storage';
import { CompositorEngine } from './services/compositor';
import { AudioEngine } from './services/audioEngine';
import { StreamManager } from './services/streamManager';
import { Header } from './components/Header';
import { SimpleMode } from './components/SimpleMode';
import { StreamerMode } from './components/StreamerMode';
import { TelemetryBar } from './components/TelemetryBar';
import { DestinationsModal } from './components/DestinationsModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Persistent Settings & Configs
  const [appMode, setAppMode] = useState<'simple' | 'streamer'>(StorageService.getAppMode());
  const [config, setConfig] = useState<StudioConfig>(StorageService.getStudioConfig());
  const [destinations, setDestinations] = useState<StreamDestination[]>(StorageService.getDestinations());
  const [scenes, setScenes] = useState<Scene[]>(StorageService.getScenes());
  const [activeSceneId, setActiveSceneId] = useState<string>(StorageService.getActiveSceneId());
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Broadcast & Recording States
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hardware Permissions & Active Streams
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [activeDisplayStream, setActiveDisplayStream] = useState<MediaStream | null>(null);
  const [activeCameraStream, setActiveCameraStream] = useState<MediaStream | null>(null);

  // Modals
  const [isDestinationsModalOpen, setIsDestinationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Compositor Performance Telemetry
  const [metrics, setMetrics] = useState<CompositorMetrics>({
    currentFps: config.fps,
    renderTimeMs: 1.2,
    droppedFrames: 0,
    totalFrames: 0,
    outputBitrate: config.bitrateKbps,
  });

  // Canvas & Engine References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CompositorEngine | null>(null);

  // Active scene sources
  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
  const sources = activeScene ? activeScene.sources : [];

  // 1. Initialize Compositor Engine when canvas is mounted
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!engineRef.current) {
      const engine = new CompositorEngine(canvasRef.current, config);
      engine.setMetricsCallback((latest) => {
        setMetrics(latest);
      });
      engineRef.current = engine;
      engine.start();
    } else {
      engineRef.current.updateConfig(config);
    }

    return () => {
      // Keep running across view switches
    };
  }, [config]);

  // 2. Sync sources and selection to Compositor Engine
  useEffect(() => {
    if (engineRef.current && activeScene) {
      // Attach active media streams to corresponding sources
      const enrichedSources = activeScene.sources.map(src => {
        if (src.type === 'display' && activeDisplayStream) {
          return { ...src, mediaStream: activeDisplayStream };
        }
        if (src.type === 'camera' && activeCameraStream) {
          return { ...src, mediaStream: activeCameraStream };
        }
        return src;
      });

      engineRef.current.setSources(enrichedSources);
      engineRef.current.setSelectedSource(selectedSourceId);
    }
  }, [activeScene, selectedSourceId, activeDisplayStream, activeCameraStream]);

  // 3. Save states on change to storage
  const handleSaveDestinations = (updated: StreamDestination[]) => {
    setDestinations(updated);
    StorageService.saveDestinations(updated);
    StreamManager.getInstance().setDestinations(updated);
  };

  const handleSaveConfig = (updated: StudioConfig) => {
    setConfig(updated);
    StorageService.saveStudioConfig(updated);
    if (engineRef.current) {
      engineRef.current.updateConfig(updated);
    }
  };

  const handleModeChange = (mode: 'simple' | 'streamer') => {
    setAppMode(mode);
    StorageService.saveAppMode(mode);
  };

  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    StorageService.saveActiveSceneId(sceneId);
    setSelectedSourceId(null);
  };

  const handleAddScene = (name: string) => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name,
      sources: [
        {
          id: `source_bg_${Date.now()}`,
          name: 'Backdrop',
          type: 'color',
          visible: true,
          locked: true,
          backgroundColor: '#0c0f17',
          transform: { x: 0, y: 0, width: config.resolution.width, height: config.resolution.height, rotation: 0, zIndex: 0 },
          opacity: 1,
        }
      ],
    };
    const updated = [...scenes, newScene];
    setScenes(updated);
    StorageService.saveScenes(updated);
    setActiveSceneId(newScene.id);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) return;
    const updated = scenes.filter(s => s.id !== sceneId);
    setScenes(updated);
    StorageService.saveScenes(updated);
    if (activeSceneId === sceneId) {
      setActiveSceneId(updated[0].id);
    }
  };

  // Source Operations
  const handleAddSource = (sourceData: Omit<StreamSource, 'id'>) => {
    const newSource: StreamSource = {
      ...sourceData,
      id: `source_${Date.now()}`,
    };

    const updatedScenes = scenes.map(sc => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: [...sc.sources, newSource],
        };
      }
      return sc;
    });

    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
    setSelectedSourceId(newSource.id);

    // Auto-trigger capture prompt if needed
    if (newSource.type === 'display' && !activeDisplayStream) {
      handleRequestDisplayCapture(newSource.id);
    } else if (newSource.type === 'camera' && !activeCameraStream) {
      handleRequestCameraCapture(newSource.id);
    }
  };

  const handleUpdateSource = (id: string, updates: Partial<StreamSource>) => {
    const updatedScenes = scenes.map(sc => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: sc.sources.map(src => src.id === id ? { ...src, ...updates } : src),
        };
      }
      return sc;
    });

    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
  };

  const handleUpdateSourceTransform = (id: string, transform: StreamSource['transform']) => {
    handleUpdateSource(id, { transform });
  };

  const handleDeleteSource = (id: string) => {
    const updatedScenes = scenes.map(sc => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: sc.sources.filter(src => src.id !== id),
        };
      }
      return sc;
    });

    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
    if (selectedSourceId === id) {
      setSelectedSourceId(null);
    }
  };

  const handleDuplicateSource = (id: string) => {
    const sourceToCopy = sources.find(s => s.id === id);
    if (!sourceToCopy) return;

    const copy: StreamSource = {
      ...sourceToCopy,
      id: `source_${Date.now()}`,
      name: `${sourceToCopy.name} (Copy)`,
      transform: {
        ...sourceToCopy.transform,
        x: sourceToCopy.transform.x + 30,
        y: sourceToCopy.transform.y + 30,
        zIndex: sources.length + 1,
      },
    };

    const updatedScenes = scenes.map(sc => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: [...sc.sources, copy],
        };
      }
      return sc;
    });

    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
    setSelectedSourceId(copy.id);
  };

  const handleReorderSources = (reordered: StreamSource[]) => {
    const updatedScenes = scenes.map(sc => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: reordered,
        };
      }
      return sc;
    });

    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
  };

  // Hardware Capture Requests
  const handleRequestDisplayCapture = async (sourceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: config.resolution.width },
          height: { ideal: config.resolution.height },
          frameRate: { ideal: config.fps },
        },
        audio: true, // Capture desktop / game audio
      });

      setActiveDisplayStream(stream);

      // Attach audio track to AudioEngine if present
      if (stream.getAudioTracks().length > 0) {
        const audio = AudioEngine.getInstance();
        audio.addTrack('desktop-audio', 'Screen Audio', 'desktop', 1.0);
        audio.attachMediaStream('desktop-audio', stream);
      }

      stream.getVideoTracks()[0].onended = () => {
        setActiveDisplayStream(null);
      };
    } catch (e) {
      console.warn('Display capture cancelled or denied:', e);
    }
  };

  const handleRequestCameraCapture = async (sourceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: config.fps },
        },
        audio: false,
      });

      setActiveCameraStream(stream);

      stream.getVideoTracks()[0].onended = () => {
        setActiveCameraStream(null);
      };
    } catch (e) {
      console.warn('Camera capture cancelled or denied:', e);
    }
  };

  const handleCaptureMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.audioEchoCancellation,
          noiseSuppression: config.audioNoiseSuppression,
          autoGainControl: config.autoGainControl,
        },
      });

      const audio = AudioEngine.getInstance();
      audio.addTrack('mic-input', 'Microphone', 'mic', 1.0);
      audio.attachMediaStream('mic-input', stream);
      setHasMicPermission(true);
      setIsMicMuted(false);
    } catch (e) {
      console.warn('Microphone permission denied:', e);
    }
  };

  const handleToggleMic = () => {
    if (!hasMicPermission) {
      handleCaptureMic();
      return;
    }
    const newMute = !isMicMuted;
    setIsMicMuted(newMute);
    AudioEngine.getInstance().setMute('mic-input', newMute);
  };

  // Simple Mode Auto-Layout Presets
  const handleApplyPreset = (preset: 'screen-cam' | 'screen-only' | 'cam-only' | 'vertical') => {
    const w = config.resolution.width;
    const h = config.resolution.height;

    let newSources: StreamSource[] = [];

    switch (preset) {
      case 'screen-cam':
        newSources = [
          {
            id: 'preset_screen',
            name: 'Screen Capture',
            type: 'display',
            visible: true,
            locked: false,
            transform: { x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: 1 },
            opacity: 1,
            mediaStream: activeDisplayStream || undefined,
          },
          {
            id: 'preset_cam',
            name: 'Facecam Studio',
            type: 'camera',
            visible: true,
            locked: false,
            transform: { x: w - 420, y: h - 320, width: 380, height: 280, rotation: 0, zIndex: 2 },
            opacity: 1,
            mediaStream: activeCameraStream || undefined,
          },
        ];
        break;

      case 'screen-only':
        newSources = [
          {
            id: 'preset_screen',
            name: 'Screen Presentation',
            type: 'display',
            visible: true,
            locked: false,
            transform: { x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: 1 },
            opacity: 1,
            mediaStream: activeDisplayStream || undefined,
          },
        ];
        break;

      case 'cam-only':
        newSources = [
          {
            id: 'preset_bg',
            name: 'Studio Backdrop',
            type: 'color',
            visible: true,
            locked: true,
            backgroundColor: '#0a0e17',
            transform: { x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: 0 },
            opacity: 1,
          },
          {
            id: 'preset_cam',
            name: 'Webcam Stream',
            type: 'camera',
            visible: true,
            locked: false,
            transform: { x: 100, y: 60, width: w - 200, height: h - 120, rotation: 0, zIndex: 1 },
            opacity: 1,
            mediaStream: activeCameraStream || undefined,
          },
        ];
        break;

      case 'vertical':
        // Update resolution to 9:16 vertical
        const vertRes = { width: 1080, height: 1920, label: 'Vertical 9:16 (TikTok/Reels)', aspect: '9:16' as const };
        handleSaveConfig({ ...config, resolution: vertRes });
        newSources = [
          {
            id: 'preset_cam_vert',
            name: 'Vertical Camera',
            type: 'camera',
            visible: true,
            locked: false,
            transform: { x: 0, y: 0, width: 1080, height: 1920, rotation: 0, zIndex: 1 },
            opacity: 1,
            mediaStream: activeCameraStream || undefined,
          },
          {
            id: 'preset_badge_vert',
            name: 'Live Pill',
            type: 'lowerthird',
            visible: true,
            locked: false,
            badgeTitle: 'LIVE ON TIKTOK / REELS',
            badgeSubtitle: 'Sen Stream by Senturisk',
            transform: { x: 60, y: 1760, width: 960, height: 100, rotation: 0, zIndex: 5 },
            opacity: 1,
          }
        ];
        break;
    }

    const updatedScenes = scenes.map(sc => sc.id === activeSceneId ? { ...sc, sources: newSources } : sc);
    setScenes(updatedScenes);
    StorageService.saveScenes(updatedScenes);
  };

  // Multi-Destination Broadcast Triggers
  const handleToggleLive = async () => {
    const sm = StreamManager.getInstance();
    sm.setDestinations(destinations);

    if (isLive) {
      sm.stopMultiStream();
      setIsLive(false);
      setLiveDuration(0);
    } else {
      if (!engineRef.current) return;
      const canvasStream = engineRef.current.getOutputMediaStream(config.fps);
      const audioStream = AudioEngine.getInstance().getOutputMediaStream();
      sm.prepareBroadcastStream(canvasStream, audioStream);

      const result = await sm.startMultiStream(config);
      if (!result.success) {
        setErrorMessage(result.message || 'Could not start stream.');
        setIsDestinationsModalOpen(true);
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        setIsLive(true);
      }
    }
  };

  const handleToggleRecord = () => {
    const sm = StreamManager.getInstance();
    if (isRecording) {
      sm.stopRecording();
      setIsRecording(false);
      setRecordDuration(0);
    } else {
      if (!engineRef.current) return;
      const canvasStream = engineRef.current.getOutputMediaStream(config.fps);
      const audioStream = AudioEngine.getInstance().getOutputMediaStream();
      const started = sm.startRecording(canvasStream, audioStream);
      if (started) {
        setIsRecording(true);
      }
    }
  };

  // Stream Manager Telemetry Listener
  useEffect(() => {
    const sm = StreamManager.getInstance();
    sm.setDestinations(destinations);

    const unsub = sm.subscribe((evt) => {
      if (evt.type === 'tick') {
        setLiveDuration(sm.getLiveDuration());
        setRecordDuration(sm.getRecordDuration());
        setDestinations([...sm.getDestinations()]);
      } else if (evt.type === 'destination-status') {
        setDestinations([...sm.getDestinations()]);
      } else if (evt.type === 'live-stop') {
        setIsLive(false);
        setLiveDuration(0);
      } else if (evt.type === 'record-stop') {
        setIsRecording(false);
        setRecordDuration(0);
      }
    });

    return unsub;
  }, [destinations]);

  return (
    <div id="sen-stream-root" className="flex flex-col h-screen w-screen overflow-hidden bg-[#070a10] text-slate-100 font-sans">
      {/* Top Bar / Header */}
      <Header
        appMode={appMode}
        onModeChange={handleModeChange}
        isLive={isLive}
        isRecording={isRecording}
        onToggleLive={handleToggleLive}
        onToggleRecord={handleToggleRecord}
        destinations={destinations}
        onOpenDestinations={() => setIsDestinationsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        config={config}
      />

      {/* Error / Alert banner */}
      {errorMessage && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center justify-between animate-fadeIn">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-300 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Mode View */}
      {appMode === 'simple' ? (
        <SimpleMode
          canvasRef={canvasRef}
          destinations={destinations}
          onToggleDestination={(id) => {
            const updated = destinations.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d);
            handleSaveDestinations(updated);
          }}
          isLive={isLive}
          onToggleLive={handleToggleLive}
          hasScreenStream={Boolean(activeDisplayStream)}
          hasCameraStream={Boolean(activeCameraStream)}
          hasMicPermission={hasMicPermission}
          onRequestDisplayCapture={handleRequestDisplayCapture}
          onRequestCameraCapture={handleRequestCameraCapture}
          onToggleMic={handleToggleMic}
          isMicMuted={isMicMuted}
          onOpenDestinations={() => setIsDestinationsModalOpen(true)}
          onApplyPreset={handleApplyPreset}
        />
      ) : (
        <StreamerMode
          canvasRef={canvasRef}
          engineRef={engineRef}
          scenes={scenes}
          activeSceneId={activeSceneId}
          onSelectScene={handleSelectScene}
          onAddScene={handleAddScene}
          onDeleteScene={handleDeleteScene}
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={setSelectedSourceId}
          onAddSource={handleAddSource}
          onUpdateSource={handleUpdateSource}
          onUpdateSourceTransform={handleUpdateSourceTransform}
          onDeleteSource={handleDeleteSource}
          onDuplicateSource={handleDuplicateSource}
          onReorderSources={handleReorderSources}
          config={config}
          onCaptureMic={handleCaptureMic}
          hasMicPermission={hasMicPermission}
          onRequestDisplayCapture={handleRequestDisplayCapture}
          onRequestCameraCapture={handleRequestCameraCapture}
        />
      )}

      {/* Real-Time Telemetry & Hardware Health Bar */}
      <TelemetryBar
        metrics={metrics}
        destinations={destinations}
        isLive={isLive}
        isRecording={isRecording}
        liveDuration={liveDuration}
        recordDuration={recordDuration}
        targetFps={config.fps}
        resolutionLabel={config.resolution.label}
      />

      {/* Destinations Modal (Stream Keys & Multi-platform) */}
      <DestinationsModal
        isOpen={isDestinationsModalOpen}
        onClose={() => setIsDestinationsModalOpen(false)}
        destinations={destinations}
        onSaveDestinations={handleSaveDestinations}
      />

      {/* Studio Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onProfileImported={() => {
          setConfig(StorageService.getStudioConfig());
          setDestinations(StorageService.getDestinations());
          setScenes(StorageService.getScenes());
        }}
      />
    </div>
  );
}
