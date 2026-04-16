import * as pdfjsLib from 'pdfjs-dist';
import { LinkArea } from '../types.ts';

// Robustly resolve getDocument (handles both ESM named exports and CJS default export)
const pdfjs: any = pdfjsLib;
const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;

/**
 * Parses a single PDF page to extract dimensions and links.
 * Fixes coordinate misalignment by using native PDF.js viewport conversions.
 */
export const extractPageData = async (page: any): Promise<{ links: LinkArea[] }> => {
  // 1. Get the viewport at scale 1.0 (unscaled PDF points)
  // This viewport object understands the PDF's coordinate system (Bottom-Left origin).
  const viewport = page.getViewport({ scale: 1.0 });
  const links: LinkArea[] = [];

  // --- Strategy A: Explicit PDF Annotations (Standard Links) ---
  const annotations = await page.getAnnotations();
  
  for (const annot of annotations) {
    if (annot.subtype === 'Link' && annot.rect) {
      // annot.rect is [xMin, yMin, xMax, yMax] in PDF Coordinates (Bottom-Left origin).
      // convertToViewportRectangle converts this to Browser Coordinates (Top-Left origin).
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(annot.rect);

      // Normalize coordinates
      const x = Math.min(vx1, vx2);
      const y = Math.min(vy1, vy2);
      const w = Math.abs(vx2 - vx1);
      const h = Math.abs(vy2 - vy1);

      links.push({
        id: `annot-${annot.id}`,
        x: (x / viewport.width) * 100, // Convert to percentage for CSS
        y: (y / viewport.height) * 100,
        width: (w / viewport.width) * 100,
        height: (h / viewport.height) * 100,
        url: annot.url,
        // Handling internal page destination would go here (requires resolving dest array)
        pageDest: undefined 
      });
    }
  }

  // --- Strategy B: Text Regex Matching (Fallback for plain text URLs) ---
  const textContent = await page.getTextContent();
  const urlRegex = /(https?:\/\/[^\s)]+)/gi;

  textContent.items.forEach((item: any, idx: number) => {
    if (!item.str) return;
    
    let match;
    // Reset regex index for safety in loop
    urlRegex.lastIndex = 0;
    
    while ((match = urlRegex.exec(item.str)) !== null) {
      const url = match[0];
      
      // Coordinate Math for Text Items
      // item.transform is [scaleX, skewY, skewX, scaleY, transX, transY]
      // transX (4) and transY (5) are the start of the text baseline in PDF coords.
      const tx = item.transform;
      
      // Calculate font width/height in PDF units
      // item.width is usually provided by PDF.js. If not, estimate.
      const totalWidth = item.width || 0;
      const charWidth = totalWidth / item.str.length;
      
      const startCharIdx = match.index;
      const matchLen = url.length;

      // Calculate width of just the URL part
      const urlWidth = charWidth * matchLen;
      // Calculate offset from the start of the string
      const xOffset = charWidth * startCharIdx;

      // Font Height: transform[3] is typically scaleY (font size)
      const fontSize = Math.sqrt(tx[2]*tx[2] + tx[3]*tx[3]); 
      const pdfHeight = item.height || fontSize; 

      // PDF Coordinates of the URL text block
      // X = tx[4] + offset
      // Y = tx[5] (Baseline). Text draws UP from here.
      const pdfX = tx[4] + xOffset;
      const pdfY = tx[5];

      // Construct a PDF Rectangle [x1, y1, x2, y2]
      // PDF Origin is Bottom-Left. 
      // y1 = baseline
      // y2 = baseline + height (Top of text in PDF coords)
      const pdfRect = [pdfX, pdfY, pdfX + urlWidth, pdfY + pdfHeight];

      // Convert to Browser Viewport Coordinates (Top-Left origin)
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(pdfRect);

      const x = Math.min(vx1, vx2);
      const y = Math.min(vy1, vy2);
      const w = Math.abs(vx2 - vx1);
      const h = Math.abs(vy2 - vy1);

      // Check for duplicates (if an annotation already covers this exact spot)
      const isDuplicate = links.some(l => 
        Math.abs(l.x - (x/viewport.width)*100) < 1 && 
        Math.abs(l.y - (y/viewport.height)*100) < 1
      );

      if (!isDuplicate) {
        links.push({
          id: `text-${idx}-${match.index}`,
          x: (x / viewport.width) * 100,
          y: (y / viewport.height) * 100,
          width: (w / viewport.width) * 100,
          height: (h / viewport.height) * 100,
          url: url
        });
      }
    }
  });

  return { links };
};

export const loadDocument = async (url: string) => {
  if (!getDocument) throw new Error("PDF.js getDocument not found");
  const loadingTask = getDocument(url);
  const pdf = await loadingTask.promise;
  return pdf;
};

export const loadDocumentData = async (data: ArrayBuffer) => {
  if (!getDocument) throw new Error("PDF.js getDocument not found");
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  return pdf;
};