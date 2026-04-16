import React, { useEffect, useRef, useState } from 'react';
import { PDFPageProxy } from 'pdfjs-dist';
import { extractPageData } from '../services/pdfService.ts';
import { LinkArea } from '../types.ts';

interface PageRendererProps {
  page: PDFPageProxy | null;
  scale: number;
  width: number;
  height: number;
  onLoadComplete?: () => void;
}

const PageRenderer: React.FC<PageRendererProps> = ({ page, scale, width, height, onLoadComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [links, setLinks] = useState<LinkArea[]>([]);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    
    let active = true;

    const renderPage = async () => {
      try {
        const viewport = page.getViewport({ scale: scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set dimensions (High DPI)
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // CSS dimensions
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const context = canvas.getContext('2d');
        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext as any).promise;
        }

        const data = await extractPageData(page);
        if (active) {
          setLinks(data.links);
          if (onLoadComplete) onLoadComplete();
        }
      } catch (err) {
        console.error("Page render error:", err);
      }
    };

    renderPage();

    return () => { active = false; };
  }, [page, scale]);

  return (
    <div 
      className="relative bg-white overflow-hidden shadow-sm"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        // Force block display
        display: 'block' 
      }}
    >
      {/* 
        Layers:
        0. White Background (Layout placeholder)
        10. Canvas (PDF Image)
        20. Links (Interactive Layer)
      */}
      
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-10"
      />
      
      <div className="absolute inset-0 z-20 pointer-events-none">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url || '#'}
            target={link.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="absolute cursor-pointer hover:bg-brand-light/20 hover:ring-2 hover:ring-brand-light transition-all pointer-events-auto"
            style={{
              left: `${link.x}%`,
              top: `${link.y}%`,
              width: `${link.width}%`,
              height: `${link.height}%`,
            }}
            onClick={(e) => {
              if (!link.url) e.preventDefault();
              console.log("Link clicked:", link);
            }}
            title={link.url || "Link"}
          />
        ))}
      </div>
    </div>
  );
};

export default PageRenderer;