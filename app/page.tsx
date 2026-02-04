'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanResult {
  url: string;
  score: number; // 0-100, higher = more sus
  verdict: 'safe' | 'caution' | 'danger';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-400';
    if (score <= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score <= 30) return 'from-green-500/20 to-green-500/5';
    if (score <= 60) return 'from-yellow-500/20 to-yellow-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  const getVerdictEmoji = (verdict: string) => {
    switch (verdict) {
      case 'safe': return '✅';
      case 'caution': return '⚠️';
      case 'danger': return '🚨';
      default: return '🤔';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓';
      case 'warn': return '!';
      case 'fail': return '✗';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-400 bg-green-400/10';
      case 'warn': return 'text-yellow-400 bg-yellow-400/10';
      case 'fail': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          {/* Logo/Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
              sus<span className="text-red-500">score</span>
            </h1>
            <p className="text-gray-500 text-sm">
              paste a link. find out if it's sketchy.
            </p>
          </motion.div>

          {/* Input */}
          <motion.form 
            onSubmit={handleSubmit}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://totally-not-a-scam.com"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all text-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-white text-black font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"
                >
                  ◐
                </motion.span>
              ) : (
                'scan'
              )}
            </button>
          </motion.form>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                {/* Score Display */}
                <div className={`p-8 rounded-3xl bg-gradient-to-b ${getScoreBg(result.score)} border border-white/5`}>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-2">{getVerdictEmoji(result.verdict)}</div>
                    <div className={`text-7xl font-bold ${getScoreColor(result.score)}`}>
                      {result.score}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">sus score</div>
                  </div>

                  {/* URL display */}
                  <div className="text-center mb-6 px-4 py-2 bg-black/30 rounded-lg">
                    <span className="text-gray-400 text-sm font-mono break-all">
                      {result.url}
                    </span>
                  </div>

                  {/* Checks */}
                  <div className="space-y-2">
                    {result.checks.map((check, i) => (
                      <motion.div
                        key={check.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-black/20 rounded-xl"
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStatusColor(check.status)}`}>
                          {getStatusIcon(check.status)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{check.name}</div>
                          <div className="text-xs text-gray-500 truncate">{check.detail}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Scan another */}
                <button
                  onClick={() => {
                    setResult(null);
                    setUrl('');
                  }}
                  className="w-full mt-4 py-3 text-gray-500 hover:text-white transition-colors text-sm"
                >
                  scan another link →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 text-xs">
        <p>for informational purposes only. not financial or security advice.</p>
        <p className="mt-1">
          <a href="https://github.com/rebelchris/susscore" className="hover:text-gray-400">open source</a>
          {' · '}
          <a href="https://twitter.com/ArunMichaelDsmo" className="hover:text-gray-400">@ArunMichaelDsmo</a>
        </p>
      </footer>
    </main>
  );
}
