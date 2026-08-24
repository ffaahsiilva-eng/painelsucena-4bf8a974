import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Crop, Sun, Contrast, Grid } from "lucide-react";

interface ImageEditorProps {
  image: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (croppedImage: Blob) => void;
}

export const ImageEditor = ({ image, open, onOpenChange, onSave }: ImageEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0,
    filters: { brightness: number; contrast: number; grayscale: number; sepia: number }
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bWidth, height: bHeight } = {
        width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
        height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
    };

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, bWidth, bHeight);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;
    ctx.putImageData(
      data,
      Math.round(0 - bWidth / 2 + image.width / 2 - pixelCrop.x),
      Math.round(0 - bHeight / 2 + image.height / 2 - pixelCrop.y)
    );

    // After putImageData, filters don't apply. We need to draw the canvas back onto itself or use another canvas
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = pixelCrop.width;
    finalCanvas.height = pixelCrop.height;
    const finalCtx = finalCanvas.getContext("2d");
    if (!finalCtx) return null;

    finalCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;
    finalCtx.drawImage(canvas, 0, 0);

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation, {
        brightness,
        contrast,
        grayscale,
        sepia,
      });
      if (croppedImage) {
        onSave(croppedImage);
        onOpenChange(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Editar Foto de Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black/5">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            cropShape="round"
            showGrid={true}
          />
        </div>

        <div className="p-4 bg-background border-t space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Crop className="w-4 h-4" /> Zoom
                  </Label>
                  <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => setZoom(v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Grid className="w-4 h-4" /> Rotação
                  </Label>
                  <span className="text-xs text-muted-foreground">{rotation}°</span>
                </div>
                <Slider
                  value={[rotation]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={([v]) => setRotation(v)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Sun className="w-3 h-3" /> Brilho
                  </Label>
                  <Slider
                    value={[brightness]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={([v]) => setBrightness(v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Contrast className="w-3 h-3" /> Contraste
                  </Label>
                  <Slider
                    value={[contrast]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={([v]) => setContrast(v)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => { setGrayscale(grayscale === 100 ? 0 : 100); setSepia(0); }}
                >
                  P&B
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => { setSepia(sepia === 100 ? 0 : 100); setGrayscale(0); }}
                >
                  Sépia
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setGrayscale(0);
                    setSepia(0);
                    setZoom(1);
                    setRotation(0);
                  }}
                >
                  Resetar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Salvar Foto"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
