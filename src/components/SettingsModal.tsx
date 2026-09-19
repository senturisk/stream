import { useState } from 'react';
import { StudioConfig, TargetFPS } from '../types/stream';
import { DEFAULT_RESOLUTIONS, StorageService } from '../services/storage';
import { X, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StudioConfig;
  onSaveConfig: (config: StudioConfig) => void;
  onProfileImported?: () => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onProfileImported,
}: SettingsModalProps) => {
  const [current, setCurrent] = useState<StudioConfig>(config);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(current);
    onClose();
  };

  const handleExport = () => {
    const jsonStr = StorageService.exportProfile();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SenStream_Backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importProfile(content);
      if (success) {
        setCurrent(StorageService.getStudioConfig());
        if (onProfileImported) onProfileImported();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div 
        id="settings-modal"
        className="w-full max-w-md bg-[#141923] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Sen_Stream_logo.png" alt="Sen Stream" className="w-6 h-6 rounded-lg object-contain" />
            <h2 className="font-bold text-white text-base">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quality Presets */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">Video Quality</label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_RESOLUTIONS.slice(0, 4).map(res => {
                const isSelected = current.resolution.width === res.width && current.resolution.height === res.height;
                return (
                  <button
                    key={res.label}
                    type="button"
                    onClick={() => setCurrent({ ...current, resolution: res })}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>{res.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{res.width}x{res.height}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smoothness (FPS) */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">Smoothness (FPS)</label>
            <div className="grid grid-cols-3 gap-2">
              {([30, 60, 120] as TargetFPS[]).map(fps => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setCurrent({ ...current, fps })}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    current.fps === fps
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Magnetic Snapping Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Smart Snap to Center</span>
              <span className="text-[11px] text-slate-400">Makes elements neatly snap into place</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrent({ ...current, snapToGrid: !current.snapToGrid })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                current.snapToGrid ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  current.snapToGrid ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Backup profile */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleExport}
              className="text-slate-400 hover:text-purple-400 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Save Backup
            </button>
            <label className="text-slate-400 hover:text-purple-400 flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Restore Backup
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0e121a] border-t border-slate-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
