"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type TopBarBookNav = {
  bookId: string;
  title: string;
  chapters: { id: number; title: string }[];
  activeChapterId: number;
  onChapterSelect: (id: number) => void;
};

type TopBarContextType = {
  bookNav: TopBarBookNav | null;
  scrolled: boolean;
  setBookNav: (nav: TopBarBookNav) => void;
  updateActiveChapter: (id: number) => void;
  clearBookNav: () => void;
  setScrolled: (v: boolean) => void;
};

const TopBarContext = createContext<TopBarContextType>({
  bookNav: null,
  scrolled: false,
  setBookNav: () => {},
  updateActiveChapter: () => {},
  clearBookNav: () => {},
  setScrolled: () => {},
});

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const [bookNav, setBookNavState] = useState<TopBarBookNav | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const bookNavRef = useRef<TopBarBookNav | null>(null);

  const setBookNav = useCallback((nav: TopBarBookNav) => {
    bookNavRef.current = nav;
    setBookNavState(nav);
  }, []);

  const updateActiveChapter = useCallback((id: number) => {
    setBookNavState(prev => {
      if (!prev || prev.activeChapterId === id) return prev;
      const next = { ...prev, activeChapterId: id };
      bookNavRef.current = next;
      return next;
    });
  }, []);

  const clearBookNav = useCallback(() => {
    bookNavRef.current = null;
    setBookNavState(null);
    setScrolled(false);
  }, []);

  return (
    <TopBarContext.Provider value={{ bookNav, scrolled, setBookNav, updateActiveChapter, clearBookNav, setScrolled }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  return useContext(TopBarContext);
}
