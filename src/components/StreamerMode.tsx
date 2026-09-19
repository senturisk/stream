import { useState } from 'react';
import { Scene, StreamSource, StudioConfig } from '../types/stream';
import { CompositorEngine } from '../services/compositor';
import { CanvasStage } from './CanvasStage';
import { AudioMixerDock } from './AudioMixerDock';
import { SourceCatalogModal } from './SourceCatalogModal';
import { 
  Layers, 
  Volume2, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Monitor,
  Camera,
  Type,
  Tv
} from 'lucide-react';

interface StreamerModeProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engineRef: React.MutableRefObject<CompositorEngine | null>;
  scenes: Scene[];
  activeSceneId: string;
  onSelectScene: (id: string) => void;
  onAddScene: (name: string) => void;
  onDeleteScene: (id: string) => void;
  sources: StreamSource[];
  selectedSourceId: string | null;
  onSelectSource: (id: string | null) => void;
  onAddSource: (source: Omit<StreamSource, 'id'>) => void;
  onUpdateSource: (id: string, updates: Partial<StreamSource>) => void;
  onUpdateSourceTransform: (id: string, transform: StreamSource['transform']) => void;
  onDeleteSource: (id: string) => void;
  onDuplicateSource: (id: string) => void;
  onReorderSources: (reordered: StreamSource[]) => void;
  config: StudioConfig;
  onCaptureMic: () => void;
  hasMicPermission: boolean;
  onRequestDisplayCapture: (sourceId: string) => void;
  onRequestCameraCapture: (sourceId: string) => void;
}

export const StreamerMode = ({
  canvasRef,
  engineRef,
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  sources,
  selectedSourceId,
  onSelectSource,
  onAddSource,
  onUpdateSource,
  onUpdateSourceTransform,
  onDeleteSource,
  onDuplicateSource,
  config,
  onCaptureMic,
  hasMicPermission,
  onRequestDisplayCapture,
  onRequestCameraCapture,
}: StreamerModeProps) => {
  const [rightTab, setRightTab] = useState<'layers' | 'audio'>('layers');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  const handleCreateScene = () => {
    if (!newSceneName.trim()) return;
    onAddScene(newSceneName.trim());
    setNewSceneName('');
    setIsAddingScene(false);
  };

  return (
    <div id="streamer-mode-layout" className="flex-1 flex overflow-hidden bg-[#0a0d14]">
      {/* Left Sidebar: Scenes & Quick Add */}
      <aside className="w-48 bg-[#0e121a] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">Scenes</span>
          <button
            type="button"
            onClick={() => setIsAddingScene(true)}
            className="p-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 text-xs font-bold"
            title="Add Scene"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scene List */}
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {isAddingScene && (
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 space-y-2 mb-2">
              <input
                type="text"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="Scene name..."
                className="w-full px-2 py-1 rounded bg-slate-900 text-xs text-white border border-slate-700"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setIsAddingScene(false)}
                  className="px-2 py-0.5 text-[10px] text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateScene}
                  className="px-2 py-0.5 text-[10px] bg-purple-600 text-white rounded font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {scenes.map(scene => {
            const isActive = scene.id === activeSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                className={`w-full px-3 py-2 rounded-xl text-left cursor-pointer flex items-center justify-between text-xs transition-all group ${
                  isActive
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{scene.name}</span>
                {scenes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Add Elements */}
        <div className="p-2.5 border-t border-slate-800/80 space-y-1.5 bg-[#0a0d14]">
          <span className="text-[10px] font-bold uppercase text-slate-500 block px-1">
            Add To Stream
          </span>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                onAddSource({
                  name: 'Screen',
                  type: 'display',
                  visible: true,
                  locked: false,
                  transform: { x: 0, y: 0, width: config.resolution.width, height: config.resolution.height, rotation: 0, zIndex: 1 },
                  opacity: 1,
                });
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" /> Screen
            </button>
            <button
              type="button"
              onClick={() => {
                onAddSource({
                  name: 'Camera',
                  type: 'camera',
                  visible: true,
                  locked: false,
                  transform: { x: config.resolution.width - 420, y: config.resolution.height - 320, width: 380, height: 280, rotation: 0, zIndex: 10 },
                  opacity: 1,
                });
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" /> Cam
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="w-full py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> More Items
          </button>
        </div>
      </aside>

      {/* Center: Canva-Style Magnetic Canvas Stage */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <CanvasStage
          canvasRef={canvasRef}
          engineRef={engineRef}
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={onSelectSource}
          onUpdateSourceTransform={onUpdateSourceTransform}
          onDuplicateSource={onDuplicateSource}
          onDeleteSource={onDeleteSource}
          onBringForward={() => {}}
          onSendBackward={() => {}}
          config={config}
        />
      </main>

      {/* Right Sidebar: Elements & Audio */}
      <aside className="w-60 bg-[#0e121a] border-l border-slate-800/80 flex flex-col shrink-0 select-none">
        {/* Simple Tab Header */}
        <div className="flex border-b border-slate-800/80 p-1">
          <button
            type="button"
            onClick={() => setRightTab('layers')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              rightTab === 'layers'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Elements ({sources.length})
          </button>

          <button
            type="button"
            onClick={() => setRightTab('audio')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              rightTab === 'audio'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Sound
          </button>
        </div>

        {/* Tab 1: Elements (Layers) */}
        {rightTab === 'layers' && (
          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {sources.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No items on canvas.
                <br />Click &quot;+ More Items&quot; to add.
              </div>
            ) : (
              [...sources].reverse().map((source) => {
                const isSelected = source.id === selectedSourceId;
                return (
                  <div
                    key={source.id}
                    onClick={() => onSelectSource(source.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 text-white font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate max-w-[110px]">{source.name}</span>

                    <div className="flex items-center gap-1">
                      {source.type === 'display' && !source.mediaStream && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDisplayCapture(source.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-600 text-[10px] text-white"
                        >
                          Pick
                        </button>
                      )}
                      {source.type === 'camera' && !source.mediaStream && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestCameraCapture(source.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-600 text-[10px] text-white"
                        >
                          Cam
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSource(source.id, { visible: !source.visible });
                        }}
                        className={`p-1 rounded ${source.visible ? 'text-slate-300' : 'text-slate-600'}`}
                        title="Show/Hide"
                      >
                        {source.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSource(source.id, { locked: !source.locked });
                        }}
                        className={`p-1 rounded ${source.locked ? 'text-amber-400' : 'text-slate-500'}`}
                        title="Lock/Unlock"
                      >
                        {source.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSource(source.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Audio */}
        {rightTab === 'audio' && (
          <AudioMixerDock
            onCaptureMic={onCaptureMic}
            hasMicPermission={hasMicPermission}
          />
        )}
      </aside>

      {/* Catalog modal */}
      <SourceCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddSource={onAddSource}
        canvasWidth={config.resolution.width}
        canvasHeight={config.resolution.height}
      />
    </div>
  );
};
