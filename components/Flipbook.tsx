import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as PageFlipLib from 'page-flip';
import { PDFDocumentProxy } from 'pdfjs-dist';
import PageRenderer from './PageRenderer.tsx';
import { createFlipSound } from '../public/assets/sound.ts';

// Robustly resolve PageFlip class
const PageFlipModule: any = PageFlipLib;
const PageFlip = PageFlipModule.PageFlip || PageFlipModule.default;

export interface FlipbookHandle {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (pageNum: number) => void;
}

interface FlipbookProps {
  pdf: PDFDocumentProxy;
  zoom: number;
  onFlip?: (pageIndex: number) => void;
}

const Flipbook = forwardRef<FlipbookHandle, FlipbookProps>(({ pdf, zoom, onFlip }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [pages, setPages] = useState<number[]>([]);
  const [pageDims, setPageDims] = useState<{width: number, height: number} | null>(null);

  // 1. Audio Setup
  useEffect(() => {
    // Use the utility to create the sound object
    const audio = createFlipSound();
    audioRef.current = audio;
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      const sound = audioRef.current;
      sound.currentTime = 0;
      sound.play().catch(err => {
        // Ignored: User interaction policy or file not found
        // console.warn("Audio play failed:", err);
      });
    }
  }, []);

  useImperativeHandle(ref, () => ({
    flipNext: () => bookRef.current?.flipNext(),
    flipPrev: () => bookRef.current?.flipPrev(),
    turnToPage: (pageNum: number) => bookRef.current?.turnToPage(pageNum)
  }));

  // 2. Calculate PDF Dimensions & Pages
  useEffect(() => {
    let active = true;
    const initDimensions = async () => {
      if (!pdf) return;
      try {
        const firstPage = await pdf.getPage(1);
        const vp = firstPage.getViewport({ scale: 1.0 });
        
        // Calculate appropriate dimensions.
        // We set a base height and calculate width from aspect ratio.
        // This 'width' is for a SINGLE PAGE.
        const baseHeight = 800; 
        const ratio = vp.width / vp.height;
        const baseWidth = baseHeight * ratio;

        if (active) {
          setPageDims({ width: Math.floor(baseWidth), height: Math.floor(baseHeight) });
          // Create array of page numbers [1, 2, 3, ...]
          setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
        }
      } catch (e) {
        console.error("Failed to measure PDF page", e);
      }
    };
    initDimensions();
    return () => { active = false; };
  }, [pdf]);

  // 3. Initialize PageFlip
  useEffect(() => {
    if (!containerRef.current || !pageDims || pages.length === 0 || !PageFlip) return;

    // Clean up previous instance
    if (bookRef.current) {
      try { bookRef.current.destroy(); } catch(e) {}
      bookRef.current = null;
    }

    const initBook = async () => {
      try {
        // Ensure DOM is ready
        await new Promise(r => setTimeout(r, 100));

	const isMobile = window.matchMedia('(max-width: 767px)').matches;

        const flip = new PageFlip(containerRef.current as HTMLElement, {
          width: pageDims.width,
          height: pageDims.height,
          // 'fixed' ensures the canvas doesn't stretch weirdly
          size: 'fixed',
          
          // Limits
          minWidth: 200,
          maxWidth: 4000,
          minHeight: 300,
          maxHeight: 4000,
          
          // Layout: 
          // showCover: true -> Page 1 is single, 2-3 are spread.
          // usePortrait: true -> 세로 비율(모바일)에서는 자동으로 한 페이지 모드
          showCover: true,     
          usePortrait: isMobile,  
          
          maxShadowOpacity: 0.4,
          flippingTime: 700,
          
          // Interaction
          // 드래그/스와이프를 위해 마우스 이벤트 활성화
          useMouseEvents: true,
          clickEventForward: true, // 페이지 내부의 링크/클릭 전달
          startPage: 0,
          drawShadow: true,
          showPageCorners: false
        });

        flip.on('flip', (e: any) => {
          playSound();
          // e.data is the page index (0-based)
          if (onFlip) onFlip(e.data + 1);
        });

        const pageNodes = containerRef.current?.querySelectorAll('.page-content');
        if (pageNodes && pageNodes.length > 0) {
          flip.loadFromHTML(pageNodes as any);
          bookRef.current = flip;
        }
      } catch (err) {
        console.error("PageFlip init failed", err);
      }
    };

    initBook();

    return () => {
      if (bookRef.current) {
        try { bookRef.current.destroy(); } catch(e) {}
        bookRef.current = null;
      }
    };
  }, [pageDims, pages, playSound]);

  if (!pageDims) {
    return <div className="text-stone-400 mt-10">문서 분석 중...</div>;
  }

  // Access safe fingerprint key
  const safeFingerprint = (pdf as any).fingerprint || (pdf as any)._fingerprint || 'doc';

  return (
    <div className="flex justify-center items-start pt-10 pb-20 select-none">
      <div 
        style={{ 
          transform: `scale(${zoom})`, 
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease-out'
        }}
      >
        <div ref={containerRef} className="flip-book shadow-2xl relative z-10">
          {pages.map((pageNum) => (
            <div 
              key={`${safeFingerprint}-${pageNum}`} 
              className="page-content bg-white relative overflow-hidden" 
              style={{ width: `${pageDims.width}px`, height: `${pageDims.height}px` }}
            >
              <PageWrapper 
                pdf={pdf} 
                pageNum={pageNum} 
                width={pageDims.width} 
                height={pageDims.height} 
              />
              
              {/* Spine shadow simulation */}
              <div className="absolute top-0 bottom-0 pointer-events-none z-30" 
                   style={{
                     left: pageNum % 2 === 0 ? 'auto' : 0,
                     right: pageNum % 2 === 0 ? 0 : 'auto',
                     width: '4%',
                     background: pageNum % 2 === 0 
                       ? 'linear-gradient(to right, rgba(0,0,0,0.15), transparent)' 
                       : 'linear-gradient(to left, rgba(0,0,0,0.15), transparent)',
                   }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Optimized Page Wrapper
const PageWrapper: React.FC<{ pdf: PDFDocumentProxy, pageNum: number, width: number, height: number }> = React.memo(({ pdf, pageNum, width, height }) => {
  const [pageProxy, setPageProxy] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    pdf.getPage(pageNum).then(p => {
      if(mounted) setPageProxy(p);
    });
    return () => { mounted = false; };
  }, [pdf, pageNum]);

  return (
    <PageRenderer 
      page={pageProxy} 
      scale={2.0} // High resolution render
      width={width}
      height={height}
    />
  );
});

export default Flipbook;
