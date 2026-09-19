import { StreamSource, SnapGuide, CompositorMetrics, StudioConfig } from '../types/stream';

export interface DragState {
  sourceId: string;
  action: 'move' | 'resize-nw' | 'resize-n' | 'resize-ne' | 'resize-e' | 'resize-se' | 'resize-s' | 'resize-sw' | 'resize-w' | 'rotate';
  startX: number;
  startY: number;
  initialTransform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
}

export class CompositorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private imageElements: Map<string, HTMLImageElement> = new Map();
  
  private isRunning = false;
  private animationFrameId: number | null = null;
  private sources: StreamSource[] = [];
  private selectedSourceId: string | null = null;
  private activeGuides: SnapGuide[] = [];
  private config: StudioConfig;

  // Performance telemetry
  private frameCount = 0;
  private lastFpsTimestamp = performance.now();
  private currentFps = 60;
  private lastRenderDuration = 0;
  private droppedFrames = 0;
  private onMetricsUpdate?: (metrics: CompositorMetrics) => void;

  constructor(canvas: HTMLCanvasElement, config: StudioConfig) {
    this.canvas = canvas;
    this.config = config;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Lowest possible latency
      willReadFrequently: false,
    });
    if (!ctx) {
      throw new Error('Canvas 2D context could not be created');
    }
    this.ctx = ctx;
    this.updateDimensions();
  }

  public updateConfig(newConfig: StudioConfig): void {
    const needResize = this.config.resolution.width !== newConfig.resolution.width ||
                       this.config.resolution.height !== newConfig.resolution.height;
    this.config = newConfig;
    if (needResize) {
      this.updateDimensions();
    }
  }

  public updateDimensions(): void {
    const { width, height } = this.config.resolution;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public setSources(sources: StreamSource[]): void {
    this.sources = [...sources].sort((a, b) => a.transform.zIndex - b.transform.zIndex);
    this.syncMediaElements();
  }

  public setSelectedSource(id: string | null): void {
    this.selectedSourceId = id;
  }

  public setMetricsCallback(cb: (metrics: CompositorMetrics) => void): void {
    this.onMetricsUpdate = cb;
  }

  private syncMediaElements(): void {
    // Sync video elements for camera / display sources
    const activeIds = new Set<string>();

    this.sources.forEach(source => {
      activeIds.add(source.id);
      if ((source.type === 'camera' || source.type === 'display') && source.mediaStream) {
        let video = this.videoElements.get(source.id);
        if (!video) {
          video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          this.videoElements.set(source.id, video);
        }
        if (video.srcObject !== source.mediaStream) {
          video.srcObject = source.mediaStream;
          video.play().catch(() => {});
        }
      }

      if (source.type === 'image' && source.imageUrl) {
        if (!this.imageElements.has(source.id) || this.imageElements.get(source.id)?.src !== source.imageUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = source.imageUrl;
          this.imageElements.set(source.id, img);
        }
      }
    });

    // Cleanup unused elements
    this.videoElements.forEach((video, id) => {
      if (!activeIds.has(id)) {
        video.pause();
        video.srcObject = null;
        this.videoElements.delete(id);
      }
    });

    this.imageElements.forEach((_, id) => {
      if (!activeIds.has(id)) {
        this.imageElements.delete(id);
      }
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFpsTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      const start = performance.now();
      this.render();
      this.lastRenderDuration = performance.now() - start;

      // Telemetry calculation
      this.frameCount++;
      const elapsed = timestamp - this.lastFpsTimestamp;
      if (elapsed >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFpsTimestamp = timestamp;

        if (this.onMetricsUpdate) {
          this.onMetricsUpdate({
            currentFps: this.currentFps,
            renderTimeMs: Math.round(this.lastRenderDuration * 10) / 10,
            droppedFrames: this.droppedFrames,
            totalFrames: this.frameCount,
            outputBitrate: this.config.bitrateKbps,
          });
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public render(): void {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    // Fast clear screen
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // Draw active sources in z-index order
    for (const source of this.sources) {
      if (!source.visible) continue;
      this.renderSource(source);
    }

    // Draw snap guides if active
    if (this.activeGuides.length > 0) {
      this.renderGuides();
    }
  }

  private renderSource(source: StreamSource): void {
    const { ctx } = this;
    const { x, y, width, height, rotation } = source.transform;

    ctx.save();
    ctx.globalAlpha = source.opacity;

    // Apply translation and rotation around center
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.translate(-cx, -cy);

    switch (source.type) {
      case 'color': {
        ctx.fillStyle = source.backgroundColor || '#111827';
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'display':
      case 'camera': {
        const video = this.videoElements.get(source.id);
        if (video && video.readyState >= 2 && !video.paused) {
          ctx.drawImage(video, x, y, width, height);
        } else {
          // Placeholder gradient card when waiting for camera / stream permission
          const grad = ctx.createLinearGradient(x, y, x + width, y + height);
          grad.addColorStop(0, source.type === 'camera' ? '#1f293d' : '#131b2e');
          grad.addColorStop(1, source.type === 'camera' ? '#0f172a' : '#080d1a');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, width, height);

          // Card outline
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          // Center Icon & Title
          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 24px "Roboto Flex", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            source.name,
            cx,
            cy - 14
          );

          ctx.font = '400 16px "Roboto Flex", sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(
            source.mediaStream ? 'Rendering Stream...' : 'Click to Select Capture Input',
            cx,
            cy + 18
          );
        }
        break;
      }

      case 'text': {
        if (source.backgroundColor) {
          ctx.fillStyle = source.backgroundColor;
          this.roundRect(ctx, x, y, width, height, 12);
          ctx.fill();
        }
        ctx.fillStyle = source.textColor || '#ffffff';
        ctx.font = `700 ${source.fontSize || 48}px "Roboto Flex", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(source.text || '', cx, cy);
        break;
      }

      case 'lowerthird': {
        // Material You Pill Lower-third Banner
        const pillHeight = height;
        const radius = pillHeight / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;

        // Gradient background
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0, source.backgroundColor || '#0b57d0');
        grad.addColorStop(1, '#001d35');
        ctx.fillStyle = grad;
        this.roundRect(ctx, x, y, width, height, 16);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, x, y, width, height, 16);
        ctx.stroke();

        // Left accent circle
        const circleRadius = (height - 16) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 14 + circleRadius, cy, circleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Broadcast red dot inside
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(x + 14 + circleRadius, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Texts
        const textLeft = x + 28 + circleRadius * 2;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.font = '700 20px "Roboto Flex", sans-serif';
        ctx.fillStyle = source.textColor || '#ffffff';
        ctx.fillText(source.badgeTitle || 'LIVE BROADCAST', textLeft, cy - 2);

        ctx.font = '500 13px "Roboto Flex", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(source.badgeSubtitle || 'Powered by Sen Stream', textLeft, cy + 18);
        break;
      }

      case 'chat': {
        // Transparent live chat container
        ctx.fillStyle = source.backgroundColor || 'rgba(15, 23, 42, 0.85)';
        this.roundRect(ctx, x, y, width, height, 16);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, width, height, 16);
        ctx.stroke();

        // Chat header
        ctx.font = '600 15px "Roboto Flex", sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('LIVE STREAM CHAT', x + 20, y + 16);

        // Simulated chat items
        const mockChats = [
          { user: 'AlphaGamer', color: '#f43f5e', msg: 'Super clean quality at 60fps!' },
          { user: 'Nova_Dev', color: '#10b981', msg: 'Senturisk streaming engine is fast 🔥' },
          { user: 'SaraStreams', color: '#38bdf8', msg: 'Loving the Canva-style snapping overlay' },
          { user: 'PixelRider', color: '#eab308', msg: 'Zero lag on YouTube + Twitch!' },
          { user: 'Krono', color: '#a855f7', msg: 'Sound is balanced and clear 🎙️' },
        ];

        let curY = y + 54;
        for (const chat of mockChats) {
          if (curY + 36 > y + height) break;

          ctx.font = '600 13px "Roboto Flex", sans-serif';
          ctx.fillStyle = chat.color;
          ctx.fillText(chat.user, x + 20, curY);

          const nameWidth = ctx.measureText(chat.user).width;
          ctx.font = '400 13px "Roboto Flex", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(`: ${chat.msg}`, x + 20 + nameWidth, curY);

          curY += 32;
        }
        break;
      }

      case 'image': {
        const img = this.imageElements.get(source.id);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, x, y, width, height);
        } else {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
          ctx.fillRect(x, y, width, height);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(x, y, width, height);
        }
        break;
      }
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private renderGuides(): void {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.lineWidth = 1.5;

    for (const guide of this.activeGuides) {
      ctx.strokeStyle = guide.color || '#ec4899';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (guide.type === 'vertical') {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, canvas.height);
      } else {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(canvas.width, guide.position);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  public setGuides(guides: SnapGuide[]): void {
    this.activeGuides = guides;
  }

  // Canva-style magnetic snap calculation algorithm
  public calculateSnapping(
    testBox: { x: number; y: number; width: number; height: number },
    targetSourceId: string
  ): { x: number; y: number; guides: SnapGuide[] } {
    if (!this.config.snapToGrid) {
      return { x: testBox.x, y: testBox.y, guides: [] };
    }

    let snappedX = testBox.x;
    let snappedY = testBox.y;
    const guides: SnapGuide[] = [];
    const threshold = this.config.snapThreshold || 12;

    const { width: cWidth, height: cHeight } = this.canvas;
    const testCenterX = testBox.x + testBox.width / 2;
    const testCenterY = testBox.y + testBox.height / 2;
    const testRight = testBox.x + testBox.width;
    const testBottom = testBox.y + testBox.height;

    // 1. Canvas Bounds & Center Targets
    const verticalTargets = [
      { pos: 0, label: 'canvas-left' },
      { pos: cWidth / 2, label: 'canvas-center-x' },
      { pos: cWidth, label: 'canvas-right' },
      { pos: cWidth / 3, label: 'rule-thirds-1' },
      { pos: (2 * cWidth) / 3, label: 'rule-thirds-2' },
    ];

    const horizontalTargets = [
      { pos: 0, label: 'canvas-top' },
      { pos: cHeight / 2, label: 'canvas-center-y' },
      { pos: cHeight, label: 'canvas-bottom' },
      { pos: cHeight / 3, label: 'rule-thirds-top' },
      { pos: (2 * cHeight) / 3, label: 'rule-thirds-bottom' },
    ];

    // 2. Add other visible sources' edges and centers
    this.sources.forEach(src => {
      if (src.id === targetSourceId || !src.visible) return;
      const sx = src.transform.x;
      const sy = src.transform.y;
      const sw = src.transform.width;
      const sh = src.transform.height;

      verticalTargets.push(
        { pos: sx, label: 'src-left' },
        { pos: sx + sw / 2, label: 'src-center-x' },
        { pos: sx + sw, label: 'src-right' }
      );

      horizontalTargets.push(
        { pos: sy, label: 'src-top' },
        { pos: sy + sh / 2, label: 'src-center-y' },
        { pos: sy + sh, label: 'src-bottom' }
      );
    });

    // Check X snaps
    let minDeltaX = threshold;
    let bestSnapX: number | null = null;
    let activeGuideX: number | null = null;

    for (const target of verticalTargets) {
      // Snap Left edge
      if (Math.abs(testBox.x - target.pos) < minDeltaX) {
        minDeltaX = Math.abs(testBox.x - target.pos);
        bestSnapX = target.pos;
        activeGuideX = target.pos;
      }
      // Snap Center X
      if (Math.abs(testCenterX - target.pos) < minDeltaX) {
        minDeltaX = Math.abs(testCenterX - target.pos);
        bestSnapX = target.pos - testBox.width / 2;
        activeGuideX = target.pos;
      }
      // Snap Right edge
      if (Math.abs(testRight - target.pos) < minDeltaX) {
        minDeltaX = Math.abs(testRight - target.pos);
        bestSnapX = target.pos - testBox.width;
        activeGuideX = target.pos;
      }
    }

    if (bestSnapX !== null && activeGuideX !== null) {
      snappedX = bestSnapX;
      guides.push({ type: 'vertical', position: activeGuideX, color: '#ec4899' });
    }

    // Check Y snaps
    let minDeltaY = threshold;
    let bestSnapY: number | null = null;
    let activeGuideY: number | null = null;

    for (const target of horizontalTargets) {
      // Snap Top edge
      if (Math.abs(testBox.y - target.pos) < minDeltaY) {
        minDeltaY = Math.abs(testBox.y - target.pos);
        bestSnapY = target.pos;
        activeGuideY = target.pos;
      }
      // Snap Center Y
      if (Math.abs(testCenterY - target.pos) < minDeltaY) {
        minDeltaY = Math.abs(testCenterY - target.pos);
        bestSnapY = target.pos - testBox.height / 2;
        activeGuideY = target.pos;
      }
      // Snap Bottom edge
      if (Math.abs(testBottom - target.pos) < minDeltaY) {
        minDeltaY = Math.abs(testBottom - target.pos);
        bestSnapY = target.pos - testBox.height;
        activeGuideY = target.pos;
      }
    }

    if (bestSnapY !== null && activeGuideY !== null) {
      snappedY = bestSnapY;
      guides.push({ type: 'horizontal', position: activeGuideY, color: '#ec4899' });
    }

    return { x: snappedX, y: snappedY, guides };
  }

  public getOutputMediaStream(targetFps = 60): MediaStream {
    return this.canvas.captureStream(targetFps);
  }

  public cleanup(): void {
    this.stop();
    this.videoElements.forEach(v => {
      v.pause();
      v.srcObject = null;
    });
    this.videoElements.clear();
    this.imageElements.clear();
  }
}
