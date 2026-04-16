import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export interface LinkArea {
  id: string;
  x: number;      // CSS Percentage (0-100)
  y: number;      // CSS Percentage (0-100)
  width: number;  // CSS Percentage (0-100)
  height: number; // CSS Percentage (0-100)
  url?: string;
  pageDest?: number;
}

export interface PdfPageData {
  pageNumber: number;
  pdfPage: PDFPageProxy;
  width: number;
  height: number;
  links: LinkArea[];
}

export interface AppState {
  pdf: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  scale: number;
  error: string | null;
}
