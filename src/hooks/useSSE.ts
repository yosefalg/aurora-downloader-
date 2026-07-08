import { useState, useEffect, useRef } from 'react';

export function useSSE<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (e) {}
    };
    es.onerror = () => {
      setError('SSE connection error');
      setIsConnected(false);
    };

    return () => {
      es.close();
    };
  }, [url]);

  return { data, isConnected, error };
}
