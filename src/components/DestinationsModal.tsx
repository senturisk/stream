import { useState } from 'react';
import { StreamDestination } from '../types/stream';
import { 
  X, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Youtube,
  Twitch,
  Facebook,
  Instagram,
  Zap,
  Globe
} from 'lucide-react';

interface DestinationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: StreamDestination[];
  onSaveDestinations: (destinations: StreamDestination[]) => void;
}

export const DestinationsModal = ({
  isOpen,
  onClose,
  destinations,
  onSaveDestinations,
}: DestinationsModalProps) => {
  const [list, setList] = useState<StreamDestination[]>(destinations);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const updated = list.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d);
    setList(updated);
    onSaveDestinations(updated);
  };

  const handleKeyChange = (id: string, streamKey: string) => {
    const updated = list.map(d => d.id === id ? { ...d, streamKey } : d);
    setList(updated);
    onSaveDestinations(updated);
  };

  const handleToggleMask = (id: string) => {
    const updated = list.map(d => d.id === id ? { ...d, isKeyMasked: !d.isKeyMasked } : d);
    setList(updated);
  };

  const getIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />;
      case 'twitch': return <Twitch className="w-5 h-5 text-purple-400" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-500" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'kick': return <Zap className="w-5 h-5 text-emerald-400" />;
      default: return <Globe className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getDashboardUrl = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'https://studio.youtube.com/channel/livestreaming';
      case 'twitch': return 'https://dashboard.twitch.tv/settings/stream';
      case 'facebook': return 'https://www.facebook.com/live/producer';
      case 'kick': return 'https://kick.com/dashboard/settings/stream';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div 
        id="destinations-modal"
        className="w-full max-w-lg bg-[#141923] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Sen_Stream_logo.png" alt="Sen Stream" className="w-6 h-6 rounded-lg object-contain" />
            <h2 className="font-bold text-white text-base">Streaming Platforms</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {list.map(dest => {
            const dashUrl = getDashboardUrl(dest.platform);
            return (
              <div
                key={dest.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  dest.enabled
                    ? 'bg-[#1a2130] border-purple-500/40'
                    : 'bg-[#0f1420] border-slate-800 opacity-80'
                }`}
              >
                {/* Platform row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getIcon(dest.platform)}
                    <div>
                      <span className="text-sm font-bold text-white block">{dest.name}</span>
                      {dashUrl && (
                        <a
                          href={dashUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-0.5"
                        >
                          Find stream key <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(dest.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      dest.enabled ? 'bg-purple-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        dest.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Stream Key Input (only visible when turned on) */}
                {dest.enabled && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center gap-2">
                    <input
                      type={dest.isKeyMasked ? 'password' : 'text'}
                      value={dest.streamKey}
                      onChange={(e) => handleKeyChange(dest.id, e.target.value)}
                      placeholder="Paste stream key here"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleMask(dest.id)}
                      className="p-2 text-slate-400 hover:text-white"
                      title={dest.isKeyMasked ? 'Show key' : 'Hide key'}
                    >
                      {dest.isKeyMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0e121a] border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Keys are saved automatically</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
