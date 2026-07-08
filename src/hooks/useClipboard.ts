import { useState, useEffect } from 'react';

export function useClipboard(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.readText().then((text) => {
        if (text.startsWith('http')) setUrl(text);
      }).catch(() => {});
    }
  }, []);

  return url;
}
