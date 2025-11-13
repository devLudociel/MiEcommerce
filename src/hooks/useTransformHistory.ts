import { useState, useCallback } from 'react';
import type { ImageTransform } from '../types/customization';

interface TransformHistory {
  past: ImageTransform[];
  present: ImageTransform;
  future: ImageTransform[];
}

export function useTransformHistory(initialTransform: ImageTransform) {
  const [history, setHistory] = useState<TransformHistory>({
    past: [],
    present: initialTransform,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const pushTransform = useCallback((newTransform: ImageTransform) => {
    setHistory((current) => ({
      past: [...current.past, current.present],
      present: newTransform,
      future: [], // Clear future when new action is made
    }));
  }, []);

  const undo = useCallback((): ImageTransform | null => {
    let result: ImageTransform | null = null;
    setHistory((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      result = previous;

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    return result;
  }, []);

  const redo = useCallback((): ImageTransform | null => {
    let result: ImageTransform | null = null;
    setHistory((current) => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      result = next;

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
    return result;
  }, []);

  const reset = useCallback((newTransform: ImageTransform) => {
    setHistory({
      past: [],
      present: newTransform,
      future: [],
    });
  }, []);

  return {
    transform: history.present,
    canUndo,
    canRedo,
    pushTransform,
    undo,
    redo,
    reset,
  };
}
