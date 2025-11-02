import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CanvasWorkspaceProps {
  imageUrl?: string;
  selectedColor?: string;
  imageId?: string;
  className?: string;
}

interface ColoredMask {
  id: string;
  maskUrl: string;
  color: string;
  opacity: number;
  clickX: number;
  clickY: number;
}

export function CanvasWorkspace({ 
  imageUrl, 
  selectedColor = "#FF0000",
  imageId,
  className 
}: CanvasWorkspaceProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const baseImageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(100);
  const [masks, setMasks] = useState<ColoredMask[]>([]);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (imageUrl && baseImageRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const container = canvasContainerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth || 800;
        const containerHeight = container.clientHeight || 600;
        
        const scale = Math.min(
          containerWidth / img.width,
          containerHeight / img.height,
          1
        ) * 0.9;

        const displayWidth = img.width * scale;
        const displayHeight = img.height * scale;

        setImageDimensions({
          width: displayWidth,
          height: displayHeight
        });

        if (baseImageRef.current) {
          baseImageRef.current.src = img.src;
        }
        
        setImageLoaded(true);
        renderCanvas();
      };
      img.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load image",
          variant: "destructive"
        });
      };
      img.src = imageUrl;
    }
  }, [imageUrl, toast]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const baseImage = baseImageRef.current;
    if (!canvas || !baseImage || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    masks.forEach(mask => {
      const maskImg = new Image();
      maskImg.crossOrigin = "anonymous";
      maskImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = mask.opacity;
        ctx.globalCompositeOperation = 'multiply';
        
        ctx.fillStyle = mask.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
        
        ctx.restore();
      };
      maskImg.src = mask.maskUrl;
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [masks, imageDimensions, imageLoaded]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageUrl || isSegmenting) return;

    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = imageDimensions.width > 0 ? baseImageRef.current!.naturalWidth / imageDimensions.width : 1;
    const scaleY = imageDimensions.height > 0 ? baseImageRef.current!.naturalHeight / imageDimensions.height : 1;

    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    setIsSegmenting(true);

    try {
      const response = await apiRequest('POST', `/api/segment`, {
        imageUrl,
        clickX: actualX,
        clickY: actualY,
        imageId: imageId || undefined
      });

      const data = await response.json();

      const newMask: ColoredMask = {
        id: crypto.randomUUID(),
        maskUrl: data.maskUrl,
        color: selectedColor,
        opacity: 0.7,
        clickX: actualX,
        clickY: actualY
      };

      setMasks(prev => [...prev, newMask]);

      toast({
        title: "Part detected!",
        description: "Click detected furniture part. You can now change colors or click another part.",
      });

    } catch (error) {
      console.error('Segmentation error:', error);
      toast({
        title: "Segmentation failed",
        description: error instanceof Error ? error.message : "Failed to detect furniture part. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSegmenting(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleReset = () => {
    setZoom(100);
    setMasks([]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const baseImage = baseImageRef.current;
    if (!canvas || !baseImage) return;

    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = baseImage.naturalWidth;
    downloadCanvas.height = baseImage.naturalHeight;
    const ctx = downloadCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(baseImage, 0, 0);

    masks.forEach(mask => {
      const maskImg = new Image();
      maskImg.crossOrigin = "anonymous";
      maskImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = mask.opacity;
        ctx.globalCompositeOperation = 'multiply';
        
        ctx.fillStyle = mask.color;
        ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
        
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskImg, 0, 0, downloadCanvas.width, downloadCanvas.height);
        
        ctx.restore();
      };
      maskImg.src = mask.maskUrl;
    });

    setTimeout(() => {
      downloadCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'customized-furniture.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }, 500);
  };

  const handleUpdateLastMaskColor = () => {
    if (masks.length === 0) return;

    setMasks(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        color: selectedColor
      };
      return updated;
    });
  };

  useEffect(() => {
    if (selectedColor && masks.length > 0) {
      handleUpdateLastMaskColor();
    }
  }, [selectedColor]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 p-4 border-b bg-background">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-[120px]">
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={50}
            max={200}
            step={10}
            className="flex-1"
            data-testid="slider-zoom"
          />
          <span className="text-sm font-medium w-12 text-right" data-testid="text-zoom-level">{zoom}%</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          data-testid="button-reset"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownload}
          disabled={!imageLoaded}
          data-testid="button-download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <div 
        ref={canvasContainerRef}
        className="flex-1 relative overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center"
        data-testid="canvas-container"
      >
        {!imageUrl && (
          <div className="text-center text-muted-foreground" data-testid="text-no-image">
            <p>Upload an image to get started</p>
          </div>
        )}
        
        {imageUrl && (
          <div 
            className="relative cursor-crosshair"
            style={{
              width: `${imageDimensions.width}px`,
              height: `${imageDimensions.height}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center'
            }}
            onClick={handleCanvasClick}
            data-testid="canvas-clickable-area"
          >
            <img
              ref={baseImageRef}
              alt="Furniture"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
              data-testid="img-base-furniture"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              data-testid="canvas-overlay"
            />
            {isSegmenting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm" data-testid="loading-segmentation">
                <div className="bg-background p-4 rounded-lg shadow-lg flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Detecting furniture part...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {masks.length > 0 && (
        <div className="p-2 border-t bg-background text-sm text-muted-foreground" data-testid="text-masks-count">
          {masks.length} part{masks.length !== 1 ? 's' : ''} colored
        </div>
      )}
    </div>
  );
}
