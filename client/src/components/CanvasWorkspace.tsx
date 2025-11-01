import { useEffect, useRef, useState } from "react";
import { Canvas, Rect, Circle as FabricCircle, Image } from "fabric";
import { ZoomIn, ZoomOut, Move, Square, Circle, RotateCcw, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface CanvasWorkspaceProps {
  imageUrl?: string;
  selectedColor?: string;
  onSelectionChange?: (hasSelection: boolean) => void;
  className?: string;
}

export default function CanvasWorkspace({ 
  imageUrl, 
  selectedColor, 
  onSelectionChange,
  className 
}: CanvasWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'circle'>('select');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5',
    });

    fabricCanvasRef.current = canvas;

    if (imageUrl) {
      Image.fromURL(imageUrl).then((img: any) => {
        const scale = Math.min(
          canvas.width! / (img.width || 1),
          canvas.height! / (img.height || 1)
        ) * 0.8;
        
        img.scale(scale);
        img.set({
          left: (canvas.width! - (img.width || 0) * scale) / 2,
          top: (canvas.height! - (img.height || 0) * scale) / 2,
          selectable: false,
        });
        
        canvas.add(img);
        canvas.sendToBack(img);
      });
    }

    canvas.on('selection:created', () => onSelectionChange?.(true));
    canvas.on('selection:cleared', () => onSelectionChange?.(false));

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, onSelectionChange]);

  useEffect(() => {
    if (!fabricCanvasRef.current || !selectedColor) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.type !== 'image') {
      activeObject.set('fill', selectedColor);
      fabricCanvasRef.current.renderAll();
    }
  }, [selectedColor]);

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0];
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom / 100);
      fabricCanvasRef.current.renderAll();
    }
  };

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new Rect({
      left: 100,
      top: 100,
      fill: selectedColor || '#C0C0C0',
      width: 150,
      height: 100,
      opacity: 0.7,
    });
    fabricCanvasRef.current.add(rect);
    setActiveTool('select');
  };

  const addCircle = () => {
    if (!fabricCanvasRef.current) return;
    const circle = new FabricCircle({
      left: 200,
      top: 200,
      fill: selectedColor || '#C0C0C0',
      radius: 50,
      opacity: 0.7,
    });
    fabricCanvasRef.current.add(circle);
    setActiveTool('select');
  };

  const resetCanvas = () => {
    if (!fabricCanvasRef.current) return;
    const objects = fabricCanvasRef.current.getObjects();
    objects.forEach((obj: any) => {
      if (obj.type !== 'image') {
        fabricCanvasRef.current!.remove(obj);
      }
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/30", className)}>
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={activeTool === 'rect' ? 'default' : 'ghost'}
            onClick={addRectangle}
            data-testid="button-add-rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={activeTool === 'circle' ? 'default' : 'ghost'}
            onClick={addCircle}
            data-testid="button-add-circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button size="icon" variant="ghost" data-testid="button-undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" data-testid="button-redo">
            <Redo className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={resetCanvas} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => handleZoomChange([Math.max(25, zoom - 25)])} data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 w-32">
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={25}
              max={200}
              step={25}
              data-testid="slider-zoom"
            />
            <span className="text-xs font-mono w-12 text-right">{zoom}%</span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => handleZoomChange([Math.min(200, zoom + 25)])} data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="relative rounded-lg border-2 bg-white shadow-lg" style={{ 
          backgroundImage: 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px'
        }}>
          <canvas ref={canvasRef} data-testid="canvas-workspace" />
        </div>
      </div>
    </div>
  );
}
