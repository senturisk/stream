import { SourceType, StreamSource } from '../types/stream';
import { 
  X, 
  Monitor, 
  Camera, 
  Type, 
  Image as ImageIcon, 
  Palette, 
  BadgeHelp
} from 'lucide-react';

interface SourceCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (source: Omit<StreamSource, 'id'>) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const SourceCatalogModal = ({
  isOpen,
  onClose,
  onAddSource,
  canvasWidth,
  canvasHeight,
}: SourceCatalogModalProps) => {
  if (!isOpen) return null;

  const handleSelect = (type: SourceType) => {
    let newSource: Omit<StreamSource, 'id'>;

    switch (type) {
      case 'display':
        newSource = {
          name: 'Screen Share',
          type: 'display',
          visible: true,
          locked: false,
          transform: { x: 0, y: 0, width: canvasWidth, height: canvasHeight, rotation: 0, zIndex: 1 },
          opacity: 1,
        };
        break;

      case 'camera':
        newSource = {
          name: 'Camera',
          type: 'camera',
          visible: true,
          locked: false,
          transform: { x: canvasWidth - 420, y: canvasHeight - 320, width: 380, height: 280, rotation: 0, zIndex: 10 },
          opacity: 1,
        };
        break;

      case 'lowerthird':
        newSource = {
          name: 'Name Badge',
          type: 'lowerthird',
          visible: true,
          locked: false,
          badgeTitle: 'LIVE BROADCAST',
          badgeSubtitle: 'Sen Stream by Senturisk',
          backgroundColor: '#7c3aed',
          textColor: '#ffffff',
          transform: { x: 60, y: canvasHeight - 120, width: 440, height: 64, rotation: 0, zIndex: 20 },
          opacity: 0.95,
        };
        break;

      case 'text':
        newSource = {
          name: 'Text Banner',
          type: 'text',
          visible: true,
          locked: false,
          text: 'STREAM TITLE',
          textColor: '#ffffff',
          fontSize: 48,
          transform: { x: (canvasWidth - 500) / 2, y: 80, width: 500, height: 80, rotation: 0, zIndex: 25 },
          opacity: 1,
        };
        break;

      case 'color':
        newSource = {
          name: 'Backdrop',
          type: 'color',
          visible: true,
          locked: false,
          backgroundColor: '#1e1b4b',
          transform: { x: 0, y: 0, width: canvasWidth, height: canvasHeight, rotation: 0, zIndex: 0 },
          opacity: 1,
        };
        break;

      case 'image':
      default:
        newSource = {
          name: 'Logo Watermark',
          type: 'image',
          visible: true,
          locked: false,
          imageUrl: '/Sen_Stream_logo.png',
          transform: { x: 60, y: 60, width: 140, height: 140, rotation: 0, zIndex: 20 },
          opacity: 1,
        };
        break;
    }

    onAddSource(newSource);
    onClose();
  };

  const items = [
    { type: 'display' as SourceType, title: 'Screen Share', desc: 'Desktop, Window, or Tab', icon: <Monitor className="w-5 h-5 text-blue-400" /> },
    { type: 'camera' as SourceType, title: 'Webcam', desc: 'Facecam or external camera', icon: <Camera className="w-5 h-5 text-emerald-400" /> },
    { type: 'lowerthird' as SourceType, title: 'Name Pill', desc: 'Presenter title badge', icon: <BadgeHelp className="w-5 h-5 text-purple-400" /> },
    { type: 'text' as SourceType, title: 'Text Banner', desc: 'Headlines or notices', icon: <Type className="w-5 h-5 text-amber-400" /> },
    { type: 'image' as SourceType, title: 'Logo / Image', desc: 'Watermark overlay', icon: <ImageIcon className="w-5 h-5 text-pink-400" /> },
    { type: 'color' as SourceType, title: 'Background Color', desc: 'Studio backdrop', icon: <Palette className="w-5 h-5 text-cyan-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div 
        id="source-catalog-modal"
        className="w-full max-w-md bg-[#141923] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Sen_Stream_logo.png" alt="Sen Stream" className="w-6 h-6 rounded-lg object-contain" />
            <h2 className="font-bold text-white text-base">Add Element</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Cards Grid */}
        <div className="p-4 grid grid-cols-2 gap-2.5">
          {items.map(item => (
            <button
              key={item.type}
              type="button"
              onClick={() => handleSelect(item.type)}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 text-left transition-all group flex flex-col gap-2"
            >
              <div className="p-2 w-fit rounded-xl bg-slate-800/80 group-hover:bg-slate-700">
                {item.icon}
              </div>
              <div>
                <div className="font-bold text-white text-xs">{item.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
