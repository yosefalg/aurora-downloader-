'use client';

import { useState } from 'react';
import { UrlInput } from '@/components/download/UrlInput';
import { PreviewCard } from '@/components/download/PreviewCard';
import { useAnalyze } from '@/hooks/useAnalyze';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';

export default function Home() {
  const [url, setUrl] = useState('');
  const { data, isLoading, error, analyze, reset } = useAnalyze();

  const handleSubmit = (url: string) => {
    setUrl(url);
    analyze(url);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Aurora
            </h1>
            <p className="text-gray-400 text-lg">
              Paste any link and get media in seconds
            </p>
          </div>
          <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />
          {isLoading && (
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {data && (
            <PreviewCard
              media={data}
              url={url}
              onReset={reset}
            />
          )}
          {error && (
            <GlassCard className="text-red-400 text-center">
              {error}
            </GlassCard>
          )}
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}
