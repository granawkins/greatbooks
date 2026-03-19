"use client";

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import type { Annotation } from "./types";

type AnnotationContextValue = {
  annotations: Annotation[];
  addAnnotation: (ann: Omit<Annotation, "id" | "created_at"> & { id?: number }) => number;
  removeAnnotation: (id: number) => void;
  updateAnnotation: (id: number, updates: Partial<Annotation>) => void;
};

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error("useAnnotations must be used within AnnotationProvider");
  return ctx;
}

let tempIdCounter = -1;

export function AnnotationProvider({
  initial,
  children,
}: {
  initial: Annotation[];
  children: ReactNode;
}) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initial);

  const addAnnotation = useCallback((ann: Omit<Annotation, "id" | "created_at"> & { id?: number }): number => {
    const id = ann.id ?? tempIdCounter--;
    const full: Annotation = {
      ...ann,
      id,
      created_at: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, full]);
    return id;
  }, []);

  const removeAnnotation = useCallback((id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAnnotation = useCallback((id: number, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  return (
    <AnnotationContext.Provider value={{ annotations, addAnnotation, removeAnnotation, updateAnnotation }}>
      {children}
    </AnnotationContext.Provider>
  );
}
