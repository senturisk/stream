import { useState, useRef, useEffect, useCallback } from 'react';
import { StreamSource, SnapGuide, StudioConfig } from '../types/stream';
import { CompositorEngine } from '../services/compositor';
import { 
  Move, 
  RotateCw, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  AlignCenterHorizontal, 
  AlignCenterVertical, 
  Layers, 
  Maximize2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engineRef: React.MutableRefObject<CompositorEngine | null>;
  sources: StreamSource[];
  selectedSourceId: string | null;
  onSelectSource: (id: string | null) => void;
  onUpdateSourceTransform: (id: string, transform: StreamSource['transform']) => void;
  onDuplicateSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  config: StudioConfig;
}

export const CanvasStage = ({
  canvasRef,
  engineRef,
  sources,
  selectedSourceId,
  onSelectSource,
  onUpdateSourceTransform,
  onDuplicateSource,
  onDeleteSource,
  onBringForward,
  onSendBackward,
  config,
}: CanvasStageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragTypeRef = useRef<string | null>(null);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startTransformRef = useRef<StreamSource['transform'] | null>(null);

  const selectedSource = sources.find(s => s.id === selectedSourceId);
  const canvasWidth = config.resolution.width;
  const canvasHeight = config.resolution.height;

  // Auto calculate best fit scale on window resize or resolution change
  const autoFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 40;
    const availableW = clientWidth - padding;
    const availableH = clientHeight - padding;

    if (availableW > 0 && availableH > 0) {
      const scaleW = availableW / canvasWidth;
      const scaleH = availableH / canvasHeight;
      const fit = Math.min(scaleW, scaleH);
      setScale(Math.max(0.2, Math.min(1.0, fit)));
    }
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    autoFitScale();
    window.addEventListener('resize', autoFitScale);
    return () => window.removeEventListener('resize', autoFitScale);
  }, [autoFitScale]);

  // Handle direct mouse interaction on selected source handles or body
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate'
  ) => {
    if (!selectedSource || selectedSource.locked) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isDraggingRef.current = true;
    dragTypeRef.current = type;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startTransformRef.current = { ...selectedSource.transform };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !selectedSource || !startTransformRef.current) return;

    const dx = (e.clientX - startMouseRef.current.x) / scale;
    const dy = (e.clientY - startMouseRef.current.y) / scale;
    const init = startTransformRef.current;
    const type = dragTypeRef.current;

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;
    let newRot = init.rotation;

    if (type === 'move') {
      const rawX = init.x + dx;
      const rawY = init.y + dy;

      if (engineRef.current && config.snapToGrid) {
        const snap = engineRef.current.calculateSnapping(
          { x: rawX, y: rawY, width: init.width, height: init.height },
          selectedSource.id
        );
        newX = snap.x;
        newY = snap.y;
        setActiveGuides(snap.guides);
        engineRef.current.setGuides(snap.guides);
      } else {
        newX = rawX;
        newY = rawY;
        setActiveGuides([]);
      }
    } else if (type === 'rotate') {
      const cx = init.x + init.width / 2;
      const cy = init.y + init.height / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseCanvasX = (e.clientX - rect.left - (rect.width - canvasWidth * scale) / 2) / scale;
        const mouseCanvasY = (e.clientY - rect.top - (rect.height - canvasHeight * scale) / 2) / scale;
        const rad = Math.atan2(mouseCanvasY - cy, mouseCanvasX - cx);
        let deg = (rad * 180) / Math.PI + 90;
        if (deg < 0) deg += 360;

        // Snapping rotation to 0, 45, 90, 180, 270 degrees
        const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        for (const sa of snapAngles) {
          if (Math.abs(deg - sa) < 4) {
            deg = sa % 360;
            break;
          }
        }
        newRot = Math.round(deg);
      }
    } else {
      // 8-point resize handles
      if (type?.includes('e')) newW = Math.max(40, init.width + dx);
      if (type?.includes('s')) newH = Math.max(40, init.height + dy);
      if (type?.includes('w')) {
        const change = Math.min(dx, init.width - 40);
        newX = init.x + change;
        newW = init.width - change;
      }
      if (type?.includes('n')) {
        const change = Math.min(dy, init.height - 40);
        newY = init.y + change;
        newH = init.height - change;
      }

      // Aspect ratio maintenance if shift key is pressed
      if (e.shiftKey) {
        const aspect = init.width / init.height;
        newH = newW / aspect;
      }

      setActiveGuides([]);
      if (engineRef.current) engineRef.current.setGuides([]);
    }

    onUpdateSourceTransform(selectedSource.id, {
      ...selectedSource.transform,
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
      rotation: newRot,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragTypeRef.current = null;
      setActiveGuides([]);
      if (engineRef.current) engineRef.current.setGuides([]);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    }
  };

  // Center source actions
  const centerHorizontal = () => {
    if (!selectedSource) return;
    const newX = Math.round((canvasWidth - selectedSource.transform.width) / 2);
    onUpdateSourceTransform(selectedSource.id, {
      ...selectedSource.transform,
      x: newX,
    });
  };

  const centerVertical = () => {
    if (!selectedSource) return;
    const newY = Math.round((canvasHeight - selectedSource.transform.height) / 2);
    onUpdateSourceTransform(selectedSource.id, {
      ...selectedSource.transform,
      y: newY,
    });
  };

  return (
    <div 
      id="canvas-stage-viewport"
      ref={containerRef}
      onClick={() => onSelectSource(null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative flex-1 h-full w-full bg-[#090c12] flex items-center justify-center overflow-hidden p-6 select-none"
    >
      {/* Zoom / View controls bar */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 bg-[#141824]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-lg text-xs text-slate-300">
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.2, s - 0.05)); }}
          className="p-1 hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] px-1 font-semibold">{Math.round(scale * 100)}%</span>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(1.5, s + 0.05)); }}
          className="p-1 hover:text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-slate-700 mx-1" />
        <button
          onClick={(e) => { e.stopPropagation(); autoFitScale(); }}
          className="flex items-center gap-1 hover:text-white text-[11px] font-medium"
          title="Fit Canvas to View"
        >
          <Maximize2 className="w-3 h-3" /> Fit
        </button>
      </div>

      {/* Canva Resolution Tag */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-[#141824]/80 backdrop-blur border border-slate-800 text-[11px] text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Canvas: {canvasWidth} × {canvasHeight} ({config.resolution.aspect})</span>
      </div>

      {/* Main Scaled Stage Wrapper */}
      <div
        className="relative transition-transform duration-75 ease-out shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-slate-700/60 rounded-md overflow-visible"
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hardware Canvas */}
        <canvas
          id="main-stage-canvas"
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0 w-full h-full block bg-black"
        />

        {/* Optional Visual Grid Lines Overlay */}
        {config.showGridLines && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
              backgroundSize: `${config.gridSize * scale * 2}px ${config.gridSize * scale * 2}px`,
            }}
          />
        )}

        {/* Canva-style Click Targets for All Sources */}
        {sources.map(src => {
          if (!src.visible) return null;
          const { x, y, width, height, rotation } = src.transform;
          const isSelected = src.id === selectedSourceId;

          return (
            <div
              key={src.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSource(src.id);
              }}
              className={`absolute cursor-pointer transition-shadow ${
                !isSelected && 'hover:ring-1 hover:ring-blue-400/40'
              }`}
              style={{
                left: x * scale,
                top: y * scale,
                width: width * scale,
                height: height * scale,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            />
          );
        })}

        {/* Canva-style Interactive Selection Box for Selected Source */}
        {selectedSource && selectedSource.visible && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: selectedSource.transform.x * scale,
              top: selectedSource.transform.y * scale,
              width: selectedSource.transform.width * scale,
              height: selectedSource.transform.height * scale,
              transform: `rotate(${selectedSource.transform.rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Outline Box */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className={`absolute inset-0 border-2 cursor-move ${
                selectedSource.locked ? 'border-amber-500/80 cursor-not-allowed' : 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
              }`}
            />

            {/* Canva-style Floating Action Toolbar above element */}
            <div 
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#161c2a] border border-slate-700/90 rounded-full px-2 py-1 shadow-xl z-50 whitespace-nowrap text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-bold text-cyan-300 px-1 border-r border-slate-700">
                {selectedSource.name}
              </span>
              <button
                type="button"
                onClick={centerHorizontal}
                title="Align to Horizontal Center"
                className="p-1 hover:text-white hover:bg-slate-700/60 rounded-full"
              >
                <AlignCenterHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={centerVertical}
                title="Align to Vertical Center"
                className="p-1 hover:text-white hover:bg-slate-700/60 rounded-full"
              >
                <AlignCenterVertical className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onBringForward(selectedSource.id)}
                title="Bring Forward"
                className="p-1 hover:text-white hover:bg-slate-700/60 rounded-full"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateSource(selectedSource.id)}
                title="Duplicate Source"
                className="p-1 hover:text-white hover:bg-slate-700/60 rounded-full"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteSource(selectedSource.id)}
                title="Delete Source"
                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 8-point Resize Handles + Rotation Lollipop (hidden when locked) */}
            {!selectedSource.locked && (
              <>
                {/* Top Rotation Lollipop Handle */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                  className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group"
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900 shadow group-hover:scale-125 transition-transform" />
                  <div className="w-0.5 h-3 bg-cyan-400" />
                </div>

                {/* Corners: NW, NE, SE, SW */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow"
                />

                {/* Edges: N, E, S, W */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'n')}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'e')}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 's')}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'w')}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
