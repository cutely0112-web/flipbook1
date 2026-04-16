import React from 'react';
import ReactDOM from 'react-dom/client';
// GitHub Pages 등 정적 호스팅에서는 확장자를 명시해야 파일 찾기가 가능함
import App from './App.tsx';

// Import as namespace to handle potentially different export structures from esm.sh
import * as pdfjsLib from 'pdfjs-dist';

// Robustly resolve the library object
const pdfjs: any = pdfjsLib;

// esm.sh often puts the named exports directly on the module, or on default.
const GlobalWorkerOptions = pdfjs.GlobalWorkerOptions || pdfjs.default?.GlobalWorkerOptions;

if (GlobalWorkerOptions) {
  // We point to unpkg for the worker file because it is a standalone script, not a module.
  // Version must match the main library version in index.html (3.11.174).
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
} else {
  console.warn("PDF.js GlobalWorkerOptions not found. PDF loading may fail. Exports:", pdfjs);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);