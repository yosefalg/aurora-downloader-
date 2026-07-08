import { useState, useCallback, useEffect } from 'react';
import { useSSE } from './useSSE';

export function useDownload(id: string) {
  const { data: status, isConnected, error: sseError } = useSSE(`/api/download/${id}/events`);
  const [isLoading, setIsLoading] = useState(true);

  const cancel = useCallback(async () => {
    try {
      await fetch(`/api/download/${id}/cancel`, { method: 'POST' });
    } catch (e) {}
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return { status, isLoading, isConnected, error: sseError, cancel };
}
