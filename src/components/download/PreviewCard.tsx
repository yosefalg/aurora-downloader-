'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { QualitySelector } from './QualitySelector';
import { GlassCard } from '@/components/ui/GlassCard';
import { X } from 'lucide-react';

interface PreviewCardProps {
  media: {
    title: string;
    uploader?: string;
    duration?: number;
    description?: string;
    thumbnail: string;
    qualities: any[];
    subtitles?: any[];
  };
  url: string;
  onReset: () => void;
}

export function PreviewCard({ media, url, onReset }: PreviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <GlassCard>
        <button
          onClick={onReset}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10"
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative aspect-video w-full md:w-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800">
            {media.thumbnail && (
              <Image
                src={media.thumbnail}
                alt={media.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 256px"
                priority
              />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-white line-clamp-2">
              {media.title}
            </h3>
            {media.uploader && (
              <p className="text-gray-400 text-sm">by {media.uploader}</p>
            )}
            {media.duration && (
              <p className="text-gray-400 text-sm">
                {Math.floor(media.duration / 60)}:
                {String(media.duration % 60).padStart(2, '0')}
              </p>
            )}
            {media.description && (
              <p className="text-gray-400 text-sm line-clamp-2">
                {media.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <QualitySelector
            qualities={media.qualities}
            url={url}
            subtitles={media.subtitles}
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}
