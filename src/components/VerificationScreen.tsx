import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, RefreshCw, Send, LogOut, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { auth, sendEmailVerification } from '../firebase';

export function VerificationScreen({ onVerified, onLogout }: { onVerified: () => void, onLogout: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a minute before trying again.');
      } else {
        setError(err.message || 'Failed to send verification email.');
      }
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        onVerified();
      } else {
        setError('Email is still not verified. Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh status.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 selection:bg-white selection:text-black">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl shadow-white/10">
            <Zap className="w-7 h-7 text-black fill-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BLAZE-AI</h1>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Verify your email</h2>
            <p className="text-zinc-400 text-sm">
              We've sent a verification link to<br/>
              <span className="text-white font-medium">{auth.currentUser?.email}</span>
            </p>
            <p className="text-zinc-500 text-xs mt-2">
              Please verify your email before continuing to the dashboard.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm text-left"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm text-left"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Resend Email</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onLogout}
              className="text-sm font-bold text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
