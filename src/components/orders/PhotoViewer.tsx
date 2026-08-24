import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PhotoViewerProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiImageUrl?: string | null;
}

export function PhotoViewer({ photos, initialIndex = 0, open, onOpenChange, aiImageUrl }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const allPhotos = [...photos, ...(aiImageUrl ? [aiImageUrl] : [])];

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [open, initialIndex, resetZoom]);

  if (allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[currentIndex];
  const isAiImage = currentPhoto === aiImageUrl;

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.3, 5));
    } else {
      setScale((s) => {
        const next = Math.max(s - 0.3, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    posStart.current = { ...position };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: posStart.current.x + (e.touches[0].clientX - dragStart.current.x),
      y: posStart.current.y + (e.touches[0].clientY - dragStart.current.y),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
        <div
          ref={containerRef}
          className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh] overflow-hidden select-none"
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Zoom controls */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={zoomOut} disabled={scale <= 1}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-xs min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={zoomIn} disabled={scale >= 5}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            {scale > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={resetZoom}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* AI Badge */}
          {isAiImage && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-primary/80 text-primary-foreground px-2 py-1 rounded-md text-sm">
              <Sparkles className="w-4 h-4" />
              Gerada por IA
            </div>
          )}

          {/* Navigation - Previous */}
          {allPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 text-white hover:bg-white/20"
              onClick={goPrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {/* Image */}
          <img loading="lazy" decoding="async"
            src={currentPhoto}
            alt={`Foto ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain transition-transform duration-150"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            draggable={false}
          />

          {/* Navigation - Next */}
          {allPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 text-white hover:bg-white/20"
              onClick={goNext}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {allPhotos.length}
          </div>

          {/* Thumbnails */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
              {allPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                    index === currentIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img loading="lazy" decoding="async"
                    src={photo}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photo === aiImageUrl && (
                    <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-center text-primary-foreground">
                      IA
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
