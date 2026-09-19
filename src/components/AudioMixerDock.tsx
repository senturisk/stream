import { useState, useEffect } from 'react';
import { AudioTrackInfo } from '../types/stream';
import { AudioEngine } from '../services/audioEngine';
import { Volume2, VolumeX, Mic, Monitor } from 'lucide-react';

interface AudioMixerDockProps {
  onCaptureMic: () => void;
  hasMicPermission: boolean;
}

export const AudioMixerDock = ({
  onCaptureMic,
  hasMicPermission,
}: AudioMixerDockProps) => {
  const [tracks, setTracks] = useState<AudioTrackInfo[]>([]);
  const engine = AudioEngine.getInstance();

  useEffect(() => {
    const unsub = engine.subscribeMeters((latestTracks) => {
      setTracks(latestTracks);
    });
    return unsub;
  }, [engine]);

  const handleVolumeChange = (id: string, vol: number) => {
    engine.setVolume(id, vol);
  };

  const handleToggleMute = (id: string, currentMuted: boolean) => {
    engine.setMute(id, !currentMuted);
  };

  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return Math.round(((db + 60) / 60) * 100);
  };

  return (
    <div id="audio-mixer-dock" className="h-full flex flex-col text-xs select-none">
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {!hasMicPermission && (
          <button
            type="button"
            onClick={onCaptureMic}
            className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" /> Enable Microphone
          </button>
        )}

        {tracks.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No audio sources active.
          </div>
        ) : (
          tracks.map(track => {
            const meterPct = dbToPercent(track.levelDb);

            return (
              <div 
                key={track.id} 
                className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    {track.type === 'mic' ? <Mic className="w-3.5 h-3.5 text-purple-400" /> : <Monitor className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="font-semibold text-slate-200 truncate">{track.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleMute(track.id, track.muted)}
                    className={`p-1 rounded ${track.muted ? 'text-rose-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Level meter bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${meterPct}%` }}
                  />
                </div>

                {/* Volume slider */}
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={track.muted ? 0 : track.volume}
                  onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                  className="w-full h-1"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
