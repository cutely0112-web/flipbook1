import React, { useEffect, useState, useRef } from 'react';
import { loadDocument, loadDocumentData } from './services/pdfService.ts';
import Flipbook, { FlipbookHandle } from './components/Flipbook.tsx';
import { AppState } from './types.ts';
import {
  BookOpen,
  ZoomIn,
  ZoomOut,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const DEMO_PDF =
  'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf';

// Vite + GitHub Pages base 경로 고려
const LOGO_URL = `${import.meta.env.BASE_URL}assets/logo.png`;

type Ebook = {
  name: string;
  url: string;
};

// ./ebooks 안의 PDF를 빌드 시 자동 스캔
const EBOOKS: Ebook[] = (() => {
  const modules = import.meta.glob('./ebooks/*.pdf', {
    eager: true,
  }) as Record<string, any>;

  return Object.entries(modules).map(([path, mod]) => {
    const url: string = typeof mod === 'string' ? mod : mod.default;
    const fileName = path.split('/').pop() ?? 'ebook.pdf';
    const name = fileName.replace(/\.pdf$/i, '');
    return { name, url };
  });
})();

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    pdf: null,
    totalPages: 0,
    currentPage: 1,
    isLoading: true,
    scale: 1.0,
    error: null,
  });

  const [selectedEbook, setSelectedEbook] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flipbookRef = useRef<FlipbookHandle | null>(null);

  // 화면 폭 기준으로 모바일 여부 판단
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = (m: MediaQueryList | MediaQueryListEvent) => {
      setIsSmallScreen(m.matches);
    };

    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // URL 기반 PDF 로드
  const loadPdfFromUrl = async (url: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      pdf: null,
      currentPage: 1,
    }));

    try {
      const pdf = await loadDocument(url);
      setState(prev => ({
        ...prev,
        pdf,
        totalPages: pdf.numPages,
        isLoading: false,
      }));
    } catch (e: any) {
      console.error(e);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'PDF를 열 수 없습니다.',
      }));
    }
  };

  // 데모 PDF 로드
  const loadDemo = async () => {
    setSelectedEbook('');
    setIsMobileMenuOpen(false);
    await loadPdfFromUrl(DEMO_PDF);
  };

  useEffect(() => {
    loadDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로컬 파일 업로드
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedEbook('');
    setIsMobileMenuOpen(false);

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      pdf: null,
      currentPage: 1,
    }));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await loadDocumentData(arrayBuffer);
      setState(prev => ({
        ...prev,
        pdf,
        totalPages: pdf.numPages,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '파일을 열 수 없습니다. 손상된 PDF일 수 있습니다.',
      }));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // eBook 선택
  const handleSelectEbook = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setSelectedEbook(value);
    if (!value) return;

    setIsMobileMenuOpen(false);
    await loadPdfFromUrl(value);
  };

  // 확대/축소
  const handleZoom = (delta: number) => {
    setState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3.0, prev.scale + delta)),
    }));
  };

  const handlePrevPage = () => flipbookRef.current?.flipPrev();
  const handleNextPage = () => flipbookRef.current?.flipNext();

  const handlePageFlip = (pageIndex: number) => {
    setState(prev => ({ ...prev, currentPage: pageIndex }));
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-paper text-brand-DEFAULT overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 shrink-0 z-20 shadow-sm relative">
        {/* Coupang Banner */}
        <div className="flex flex-col items-center bg-stone-50 border-b border-stone-100 py-1 overflow-hidden">
          <a
            href="https://link.coupang.com/a/eqlzU3"
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="unsafe-url"
          >
            <img
              src="https://ads-partners.coupang.com/banners/981420?subId=&traceId=V0-301-879dd1202e5c73b2-I981420&w=728&h=90"
              alt="쿠팡 추천 제품"
              className="max-w-full h-auto block mx-auto"
            />
          </a>
          <p className="text-[16px] text-sky-400 mt-0.5 px-4 text-center">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </p>
        </div>
        {/* 모바일 헤더 */}
        <div className="md:hidden h-12 px-4 flex items-center justify-between">
          <button
            className="flex items-center gap-2"
            onClick={loadDemo}
          >
            <img
              src={LOGO_URL}
              alt="놀꿈 연구소 로고"
              className="w-7 h-7 rounded-full object-contain"
            />
            <span className="text-sm font-semibold">
              놀꿈 연구소 플립북
            </span>
          </button>

          <button
            className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-200 bg-stone-50"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-stone-700" />
            ) : (
              <Menu className="w-5 h-5 text-stone-700" />
            )}
          </button>
        </div>

        {/* 데스크톱 헤더 */}
        <div className="hidden md:flex h-14 px-6 items-center justify-between">
          {/* 왼쪽: 로고 + 타이틀 */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={loadDemo}
          >
            <img
              src={LOGO_URL}
              alt="놀꿈 연구소 로고"
              className="w-9 h-9 rounded-full object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-semibold text-stone-900">
                놀꿈 연구소 플립북
              </span>
              <span className="text-xs text-stone-500">
                PDF를 실제 책 넘기듯 읽어보는 뷰어
              </span>
            </div>
          </div>

          {/* 가운데: 페이지 네비게이션 */}
          <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-full px-2 py-1">
            <button
              onClick={handlePrevPage}
              disabled={!state.pdf || state.currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 hover:bg-stone-50 hover:shadow-sm rounded-full transition-all disabled:opacity-30"
              title="이전 페이지"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="w-24 text-center text-sm font-medium tabular-nums select-none text-stone-700">
              {state.pdf
                ? `${state.currentPage} / ${state.totalPages}`
                : '- / -'}
            </span>
            <button
              onClick={handleNextPage}
              disabled={
                !state.pdf || state.currentPage >= state.totalPages
              }
              className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 hover:bg-stone-50 hover:shadow-sm rounded-full transition-all disabled:opacity-30"
              title="다음 페이지"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 오른쪽: eBook + 업로드 + 줌 */}
          <div className="flex items-center gap-3">
            {EBOOKS.length > 0 && (
              <select
                className="border border-stone-300 rounded-md text-sm px-2 py-1 bg-white"
                value={selectedEbook}
                onChange={handleSelectEbook}
                title="eBook 선택"
              >
                <option value="">eBook 선택</option>
                {EBOOKS.map(book => (
                  <option key={book.url} value={book.url}>
                    {book.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf"
              title="PDF 파일 업로드"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-brand bg-brand-light whitespace-nowrap"
            >
              <Upload size={18} />
              <span className="ml-2 text-sm">PDF 열기</span>
            </button>

            <div className="flex items-center gap-1 bg-stone-100 rounded-full px-1 py-0.5 border border-stone-200">
              <button
                onClick={() => handleZoom(-0.1)}
                className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-full transition-colors"
                title="축소"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-xs w-12 text-center tabular-nums text-stone-700">
                {(state.scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => handleZoom(0.1)}
                className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-full transition-colors"
                title="확대"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 패널 */}
        {isSmallScreen && isMobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-3 shadow-md">
            {state.pdf && (
              <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                <span>페이지</span>
                <span className="font-medium">
                  {state.currentPage} / {state.totalPages}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrevPage}
                disabled={!state.pdf || state.currentPage <= 1}
                className="flex-1 h-9 flex items-center justify-center rounded-full bg-stone-100 text-xs font-medium disabled:opacity-30"
              >
                <ChevronLeft size={16} className="mr-1" />
                이전
              </button>
              <button
                onClick={handleNextPage}
                disabled={
                  !state.pdf || state.currentPage >= state.totalPages
                }
                className="flex-1 h-9 flex items-center justify-center rounded-full bg-stone-100 text-xs font-medium disabled:opacity-30"
              >
                다음
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-stone-100 rounded-full px-1 py-0.5 border border-stone-200 flex-1">
                <button
                  onClick={() => handleZoom(-0.1)}
                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-full transition-colors"
                  title="축소"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-[11px] w-12 text-center tabular-nums text-stone-700">
                  {(state.scale * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => handleZoom(0.1)}
                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-full transition-colors"
                  title="확대"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-medium flex items-center justify-center whitespace-nowrap"
              >
                <Upload size={16} className="mr-1" />
                PDF 열기
              </button>
            </div>

            {EBOOKS.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-[11px] text-stone-500 mb-1">
                  eBook 선택
                </label>
                <select
                  className="w-full border border-stone-300 rounded-md text-xs px-2 py-1.5 bg-white"
                  value={selectedEbook}
                  onChange={handleSelectEbook}
                  title="eBook 선택"
                >
                  <option value="">선택하세요</option>
                  {EBOOKS.map(book => (
                    <option key={book.url} value={book.url}>
                      {book.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex-1 flex overflow-hidden">
        {/* 데스크탑용 사이드바 */}
        <aside className="hidden lg:flex w-72 border-r border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 flex-col p-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-light/10 flex items-center justify-center text-brand-light">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">
                플립북 리더
              </p>
              <p className="text-xs text-stone-500">
                PDF를 책 넘기듯 읽어보는 실험 프로젝트
              </p>
            </div>
          </div>

          <div className="bg-white/80 border border-stone-200 rounded-xl p-3 text-xs text-stone-600 leading-relaxed shadow-sm">
            <p className="font-semibold text-stone-800 mb-1">
              사용 방법
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>상단에서 PDF를 업로드하거나 eBook을 선택합니다.</li>
              <li>페이지는 클릭·드래그 또는 버튼으로 넘길 수 있어요.</li>
              <li>확대/축소 비율을 조절해 글자를 더 크게 볼 수 있습니다.</li>
              <li>링크가 포함된 PDF는 클릭하면 새 탭에서 열립니다.</li>
            </ul>
          </div>

          <div className="mt-auto text-[11px] text-stone-400">
            ⓒ 놀꿈 연구소 · 개인 학습용 플립북 리더
          </div>
        </aside>

        {/* 플립북 영역 */}
        <section className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {state.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <div className="w-10 h-10 border-2 border-brand-light border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-stone-600">
                PDF를 불러오는 중입니다...
              </p>
            </div>
          )}

          {!state.pdf && !state.isLoading && !state.error && (
            <div className="flex flex-col items-center justify-center text-center gap-3 p-8">
              <div className="w-20 h-20 rounded-2xl bg-dots bg-stone-100 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-brand-light" />
              </div>
              <h2 className="text-lg font-semibold text-stone-800">
                PDF 파일을 열어보세요
              </h2>
              <p className="text-sm text-stone-500 max-w-xs">
                상단의 &quot;PDF 열기&quot; 버튼을 눌러
                <br />
                내 컴퓨터의 PDF 파일을 플립북으로 읽어볼 수 있습니다.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-brand mt-2"
              >
                <Upload size={18} />
                <span className="ml-2">PDF 선택하기</span>
              </button>
            </div>
          )}

          {state.error && (
            <div className="flex flex-col items-center justify-center text-center gap-3 p-8">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-red-600 whitespace-pre-line">
                {state.error}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-brand mt-2"
              >
                다른 파일 열기
              </button>
            </div>
          )}

          {state.pdf && !state.isLoading && (
            <div className="w-full h-full flex items-center justify-center px-2 pb-2 md:px-6 md:pb-6">
              <Flipbook
                ref={flipbookRef}
                pdf={state.pdf}
                zoom={state.scale}
                onFlip={handlePageFlip}
                singlePage={isSmallScreen} // 📱 모바일에서는 1페이지 모드
              />
            </div>
          )}
        </section>
      </main>

      {/* 유틸리티 스타일 */}
      <style>{`
        .btn-brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.9rem;
          border-radius: 9999px;
          background: linear-gradient(to right, #4b6bfb, #7c3aed);
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease;
          white-space: nowrap;
        }
        .btn-brand:hover {
          filter: brightness(1.05);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.35);
          transform: translateY(-1px);
        }
        .btn-brand:active {
          filter: brightness(0.98);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25);
          transform: translateY(0);
        }
        .bg-paper {
          background: radial-gradient(circle at top, #fdfdfd 0, #f4f4f5 45%, #e5e7eb 100%);
        }
        .text-brand-DEFAULT {
          color: #111827;
        }
        .bg-dots {
          background-image: radial-gradient(#d1d5db 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .bg-brand-light {
          background-color: #4b6bfb;
        }
      `}</style>
    </div>
  );
};

export default App;
