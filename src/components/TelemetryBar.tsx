import { StreamDestination, CompositorMetrics } from '../types/stream';

interface TelemetryBarProps {
  metrics: CompositorMetrics;
  destinations: StreamDestination[];
  isLive: boolean;
  isRecording: boolean;
  liveDuration: number;
  recordDuration: number;
  targetFps: number;
  resolutionLabel: string;
}

export const TelemetryBar = ({
  metrics,
  destinations,
  isLive,
  isRecording,
  liveDuration,
  recordDuration,
}: TelemetryBarProps) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const enabledDestinations = destinations.filter(d => d.enabled);

  return (
    <footer 
      id="telemetry-bar" 
      className="h-8 px-4 bg-[#0a0d14] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none z-20"
    >
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        {isLive ? (
          <span className="flex items-center gap-1.5 font-semibold text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE {formatTime(liveDuration)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Ready
          </span>
        )}

        {isRecording && (
          <span className="flex items-center gap-1.5 font-medium text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            REC {formatTime(recordDuration)}
          </span>
        )}

        {enabledDestinations.length > 0 && (
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            • Streaming to {enabledDestinations.map(d => d.name.split(' ')[0]).join(', ')}
          </span>
        )}
      </div>

      {/* Clean minimal metrics */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="font-mono text-slate-300">{metrics.currentFps} FPS</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Smooth
        </span>
      </div>
    </footer>
  );
};
