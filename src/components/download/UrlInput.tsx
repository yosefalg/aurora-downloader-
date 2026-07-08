'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useClipboard } from '@/hooks/useClipboard';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading = false }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const clipboardUrl = useClipboard();

  useEffect(() => {
    if (clipboardUrl && !url) {
      setUrl(clipboardUrl);
    }
  }, [clipboardUrl, url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Input
          type="url"
          placeholder="Paste link here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full py-4 pl-6 pr-32 rounded-2xl bg-glass backdrop-blur-md border border-glass-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="absolute right-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition"
        >
          {isLoading ? 'Analyzing...' : 'Download'}
        </Button>
      </div>
    </form>
  );
}
