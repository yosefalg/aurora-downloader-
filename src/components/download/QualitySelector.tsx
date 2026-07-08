'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Quality {
  id: string;
  label: string;
  resolution: string;
  format: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

interface QualitySelectorProps {
  qualities: Quality[];
  url: string;
  subtitles?: { language: string }[];
}

export function QualitySelector({ qualities, url, subtitles = [] }: QualitySelectorProps) {
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const videoQualities = qualities.filter(q => q.hasVideo);
  const audioQualities = qualities.filter(q => !q.hasVideo && q.hasAudio);

  const handleDownload = async () => {
    if (!selectedQuality) return;
    setLoading(true);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality: selectedQuality.id,
          format: selectedQuality.format,
          subtitle: selectedSubtitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      toast.success('Download started!');
      router.push(`/download/${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-400 mb-2">Video Qualities</p>
        <div className="flex flex-wrap gap-2">
          {videoQualities.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuality(q)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedQuality === q
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {q.label} {q.format && `.${q.format}`}
            </button>
          ))}
        </div>
      </div>
      {audioQualities.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Audio Only</p>
          <div className="flex flex-wrap gap-2">
            {audioQualities.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQuality(q)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedQuality === q
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {q.label} (audio)
              </button>
            ))}
          </div>
        </div>
      )}
      {subtitles.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Subtitles</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubtitle(undefined)}
              className={`px-4 py-2 rounded-lg transition ${
                !selectedSubtitle
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              None
            </button>
            {subtitles.map((sub) => (
              <button
                key={sub.language}
                onClick={() => setSelectedSubtitle(sub.language)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedSubtitle === sub.language
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {sub.language}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        onClick={handleDownload}
        disabled={!selectedQuality || loading}
        fullWidth
        className="py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:opacity-90 transition"
      >
        {loading ? 'Starting...' : 'Download Selected'}
      </Button>
    </div>
  );
}
