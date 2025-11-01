import { useState } from "react";
import Header from "@/components/Header";
import ColorPalette from "@/components/ColorPalette";
import UploadZone from "@/components/UploadZone";
import CanvasWorkspace from "@/components/CanvasWorkspace";
import PropertiesPanel from "@/components/PropertiesPanel";
import ProjectGallery from "@/components/ProjectGallery";
import type { ColorItem } from "@/data/colorPalette";
import sofaImage from '@assets/generated_images/Modern_grey_sofa_furniture_4bccca05.png';
import chairImage from '@assets/generated_images/Beige_dining_chair_c4cca64b.png';
import officeChairImage from '@assets/generated_images/Brown_office_chair_3fdc19ca.png';
import tableImage from '@assets/generated_images/Round_wooden_side_table_c2d711ab.png';

export default function Home() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [selectedColor, setSelectedColor] = useState<ColorItem | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [recentColors, setRecentColors] = useState<ColorItem[]>([]);
  const [hasSelection, setHasSelection] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleColorSelect = (color: ColorItem) => {
    setSelectedColor(color);
    
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.id !== color.id);
      return [color, ...filtered].slice(0, 8);
    });
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setProjectName(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    console.log('Download image');
  };

  const handleSave = () => {
    console.log('Save project to gallery');
  };

  const mockProjects = [
    { id: '1', name: 'Modern Grey Sofa', thumbnail: sofaImage, date: 'Nov 1, 2025' },
    { id: '2', name: 'Beige Dining Chair', thumbnail: chairImage, date: 'Oct 30, 2025' },
    { id: '3', name: 'Office Chair Design', thumbnail: officeChairImage, date: 'Oct 28, 2025' },
    { id: '4', name: 'Round Side Table', thumbnail: tableImage, date: 'Oct 27, 2025' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onOpenGallery={() => setGalleryOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-card flex-shrink-0">
          <ColorPalette 
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
            recentColors={recentColors}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {uploadedImage ? (
            <CanvasWorkspace 
              imageUrl={uploadedImage}
              selectedColor={selectedColor?.hexColor}
              onSelectionChange={setHasSelection}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-2xl">
                <UploadZone onImageUpload={handleImageUpload} />
                
                <div className="mt-8">
                  <h3 className="text-sm font-medium mb-4 text-center text-muted-foreground uppercase tracking-wide">
                    Try an Example
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { img: sofaImage, name: 'Modern Sofa' },
                      { img: chairImage, name: 'Dining Chair' },
                      { img: officeChairImage, name: 'Office Chair' },
                      { img: tableImage, name: 'Side Table' }
                    ].map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setUploadedImage(example.img);
                          setProjectName(example.name);
                        }}
                        className="group flex flex-col gap-2 p-3 rounded-lg border bg-card hover-elevate active-elevate-2"
                        data-testid={`button-example-${idx}`}
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-muted">
                          <img 
                            src={example.img} 
                            alt={example.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors">
                          {example.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l bg-card flex-shrink-0">
          <PropertiesPanel 
            selectedColor={hasSelection ? selectedColor : null}
            onDownload={handleDownload}
            onSave={handleSave}
          />
        </div>
      </div>

      <ProjectGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        projects={mockProjects}
        onProjectSelect={(project) => {
          console.log('Load project:', project);
        }}
        onProjectDelete={(id) => console.log('Delete project:', id)}
        onProjectDuplicate={(id) => console.log('Duplicate project:', id)}
      />
    </div>
  );
}
