import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export function Header() {
  const router = useRouter();
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => router.push('/')}
      >
        <Zap className="w-6 h-6 text-purple-400" />
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Aurora
        </span>
      </div>
      <nav className="flex items-center gap-4 text-sm text-gray-400">
        <a href="/api/health" target="_blank" className="hover:text-white transition">
          Health
        </a>
        <a href="/api/metrics" target="_blank" className="hover:text-white transition">
          Metrics
        </a>
      </nav>
    </header>
  );
}
