import { StreamDestination } from '../types/stream';
import { 
  Monitor, 
  Camera, 
  Mic, 
  MicOff, 
  Radio, 
  Plus, 
  Check, 
  Smartphone,
  Layout,
  ExternalLink
} from 'lucide-react';

interface SimpleModeProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  destinations: StreamDestination[];
  onToggleDestination: (id: string) => void;
  isLive: boolean;
  onToggleLive: () => void;
  hasScreenStream: boolean;
  hasCameraStream: boolean;
  hasMicPermission: boolean;
  onRequestDisplayCapture: (sourceId?: string) => void;
  onRequestCameraCapture: (sourceId?: string) => void;
  onToggleMic: () => void;
  isMicMuted: boolean;
  onOpenDestinations: () => void;
  onApplyPreset: (preset: 'screen-cam' | 'screen-only' | 'cam-only' | 'vertical') => void;
}

export const SimpleMode = ({
  canvasRef,
  destinations,
  onToggleDestination,
  isLive,
  onToggleLive,
  hasScreenStream,
  hasCameraStream,
  hasMicPermission,
  onRequestDisplayCapture,
  onRequestCameraCapture,
  onToggleMic,
  isMicMuted,
  onOpenDestinations,
  onApplyPreset,
}: SimpleModeProps) => {
  const enabledCount = destinations.filter(d => d.enabled).length;

  return (
    <div id="simple-mode-layout" className="flex-1 flex flex-col overflow-hidden bg-[#0a0d14]">
      {/* Main Stream Preview Stage */}
      <div className="flex-1 p-3 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Live indicator chip */}
        <div className="absolute top-4 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs text-white">
          <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="font-semibold">{isLive ? 'STREAMING LIVE' : 'PREVIEW'}</span>
        </div>

        {/* Video Canvas Container */}
        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
          <canvas
            id="simple-mode-canvas"
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="w-full h-full object-contain block"
          />

          {/* Friendly prompt if no video source is connected yet */}
          {!hasScreenStream && !hasCameraStream && (
            <div className="absolute inset-0 bg-[#0c1018]/90 flex flex-col items-center justify-center p-6 text-center z-10">
              <img 
                src="/Sen_Stream_logo.png" 
                alt="Sen Stream" 
                className="w-16 h-16 rounded-2xl mb-4 shadow-lg object-contain" 
              />
              <h2 className="text-xl font-bold text-white mb-2">Ready to Stream?</h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6">
                Choose what you want to show to your viewers below.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onRequestDisplayCapture()}
                  className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Monitor className="w-5 h-5" />
                  Share Screen
                </button>
                <button
                  type="button"
                  onClick={() => onRequestCameraCapture()}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Camera className="w-5 h-5 text-emerald-400" />
                  Turn On Camera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Simplified Control Dock */}
      <div className="bg-[#0f1420] border-t border-slate-800/80 px-4 py-3 shrink-0 select-none">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Input Devices (Screen, Cam, Mic) */}
          <div className="flex items-center gap-2">
            {/* Screen Button */}
            <button
              type="button"
              onClick={() => onRequestDisplayCapture()}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                hasScreenStream 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>{hasScreenStream ? 'Screen Shared' : 'Share Screen'}</span>
              {hasScreenStream && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => onRequestCameraCapture()}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                hasCameraStream 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{hasCameraStream ? 'Camera On' : 'Turn On Cam'}</span>
              {hasCameraStream && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Mic Toggle */}
            <button
              type="button"
              onClick={onToggleMic}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                hasMicPermission && !isMicMuted
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800/70 hover:bg-slate-800 text-rose-400 border-slate-700/60'
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMicMuted ? 'Mic Muted' : hasMicPermission ? 'Mic Live' : 'Enable Mic'}</span>
            </button>
          </div>

          {/* Middle: Platforms to broadcast to */}
          <div className="flex items-center gap-1.5 bg-[#151b29] p-1 rounded-xl border border-slate-800">
            {destinations.slice(0, 4).map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => onToggleDestination(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  d.enabled 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={d.streamKey ? `${d.name} (${d.enabled ? 'Enabled' : 'Disabled'})` : `Click to enable ${d.name}`}
              >
                <span>{d.name.split(' ')[0]}</span>
                {d.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            ))}

            <button
              type="button"
              onClick={onOpenDestinations}
              className="p-1.5 text-slate-400 hover:text-purple-400 text-xs font-semibold rounded-lg"
              title="Add Stream Keys"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: The Master Broadcast Button */}
          <div>
            <button
              type="button"
              onClick={onToggleLive}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                isLive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25 active:scale-95'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{isLive ? 'STOP STREAM' : 'START STREAMING'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
