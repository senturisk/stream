import { Radio, Sliders, Share2, Disc, Layers, Zap } from 'lucide-react';
import { StreamDestination, StudioConfig } from '../types/stream';

interface HeaderProps {
  appMode: 'simple' | 'streamer';
  onModeChange: (mode: 'simple' | 'streamer') => void;
  isLive: boolean;
  isRecording: boolean;
  onToggleLive: () => void;
  onToggleRecord: () => void;
  destinations: StreamDestination[];
  onOpenDestinations: () => void;
  onOpenSettings: () => void;
  config: StudioConfig;
}

export const Header = ({
  appMode,
  onModeChange,
  isLive,
  isRecording,
  onToggleLive,
  onToggleRecord,
  destinations,
  onOpenDestinations,
  onOpenSettings,
}: HeaderProps) => {
  const enabledDestinationsCount = destinations.filter(d => d.enabled).length;

  return (
    <header 
      id="app-header" 
      className="h-14 px-4 bg-[#0e121a] border-b border-slate-800/80 flex items-center justify-between select-none z-30"
    >
      {/* Brand with User Uploaded Logo */}
      <div className="flex items-center gap-2.5">
        <img 
          src="/Sen_Stream_logo.png" 
          alt="Sen Stream Logo" 
          className="w-8 h-8 rounded-xl shadow object-contain"
        />
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-base text-white tracking-tight">Sen Stream</span>
          <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            by Senturisk
          </span>
        </div>
      </div>

      {/* Simplified Mode Switcher */}
      <div className="flex items-center bg-[#151a26] p-1 rounded-full border border-slate-800 shadow-inner">
        <button
          id="btn-mode-simple"
          onClick={() => onModeChange('simple')}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
            appMode === 'simple'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Simple
        </button>

        <button
          id="btn-mode-streamer"
          onClick={() => onModeChange('streamer')}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
            appMode === 'streamer'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Custom Studio
        </button>
      </div>

      {/* Right Controls: Platforms, Record, Settings, GO LIVE */}
      <div className="flex items-center gap-2">
        <button
          id="btn-destinations"
          onClick={onOpenDestinations}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium transition-all border border-slate-700/60"
          title="Streaming Platforms & Keys"
        >
          <Share2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Platforms</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
            {enabledDestinationsCount}
          </span>
        </button>

        <button
          id="btn-toggle-record"
          onClick={onToggleRecord}
          className={`p-2 rounded-xl text-xs font-medium transition-all border ${
            isRecording
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border-slate-700/60'
          }`}
          title={isRecording ? 'Stop Recording' : 'Record Stream'}
        >
          <Disc className={`w-4 h-4 ${isRecording ? 'text-rose-500 animate-spin' : ''}`} />
        </button>

        <button
          id="btn-settings"
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-all border border-slate-700/60"
          title="Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Master Big GO LIVE Button */}
        <button
          id="btn-toggle-live"
          onClick={onToggleLive}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ml-1 ${
            isLive
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-600/25'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{isLive ? 'END' : 'GO LIVE'}</span>
        </button>
      </div>
    </header>
  );
};
