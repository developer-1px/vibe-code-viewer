/**
 * useScrollNavigation - IDEScrollView 내부 스크롤 관리 훅
 *
 * 책임:
 * - activeTab 변경 시 해당 섹션으로 스크롤 (scrollToFile)
 * - Intersection Observer로 현재 보고 있는 파일 추적 (currentFilePath)
 * - 파일 섹션 DOM 요소 등록 (registerSection)
 *
 * 주의: 이것은 Widget 내부 UI 구현 세부사항입니다.
 * Feature 레이어는 activeTabAtom만 변경하고, Widget이 스크롤로 반응합니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useScrollNavigation(filePaths: string[]) {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(filePaths.length > 0 ? filePaths[0] : null);
  const sectionRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer 초기화 (한 번만)
  useEffect(() => {
    // Observer 생성
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // 가장 많이 보이는 섹션 찾기
        let maxRatio = 0;
        let maxFilePath: string | null = null;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const filePath = entry.target.id.replace('file-section-', '');
            maxFilePath = filePath;
          }
        });

        if (maxFilePath) {
          setCurrentFilePath(maxFilePath);
        }
      },
      {
        root: document.getElementById('scroll-view-container'),
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
        rootMargin: '-20px 0px -20px 0px',
      }
    );

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Ref 등록 함수 - 등록 시 즉시 observe
  const registerSection = useCallback((filePath: string, element: HTMLDivElement | null) => {
    const observer = observerRef.current;
    if (!observer) return;

    // 이전 element가 있으면 unobserve
    const prevElement = sectionRefsRef.current.get(filePath);
    if (prevElement) {
      observer.unobserve(prevElement);
    }

    if (element) {
      // 새 element 등록 및 observe
      sectionRefsRef.current.set(filePath, element);
      observer.observe(element);
    } else {
      // element가 null이면 제거
      sectionRefsRef.current.delete(filePath);
    }
  }, []);

  // 특정 파일로 스크롤
  const scrollToFile = useCallback((filePath: string) => {
    const element = sectionRefsRef.current.get(filePath);
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      setCurrentFilePath(filePath);
    }
  }, []);

  return {
    currentFilePath,
    registerSection,
    scrollToFile,
  };
}
