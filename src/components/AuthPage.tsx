import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  googleProvider,
  sendEmailVerification,
  sendPasswordResetEmail
} from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthPageProps {
  onBack?: () => void;
}

export function AuthPage({ onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const validateForm = () => {
    setError(null);
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    if (!isLogin) {
      if (!name) {
        setError('Please enter your name.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      if (!agreeTerms) {
        setError('You must agree to the Terms & Conditions.');
        return false;
      }
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('blaze_auth_status', 'logged_in');
        setIsSuccess(true);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });

        try {
          await sendEmailVerification(user);
        } catch (verifyErr) {
          console.error("Verification email failed to send:", verifyErr);
        }

        // Save user data in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: email,
          displayName: name,
          createdAt: serverTimestamp(),
          plan: 'FREE',
          role: 'user',
          theme: 'dark',
          mode: 'lite'
        });
        
        localStorage.setItem('blaze_auth_status', 'logged_in');
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !agreeTerms) {
      setError('You must agree to the Terms & Conditions.');
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          plan: 'FREE',
          role: 'user',
          theme: 'dark',
          mode: 'lite'
        });
      }

      localStorage.setItem('blaze_auth_status', 'logged_in');
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError(null); // User intentionally closed the popup
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'An error occurred during Google authentication.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isSuccess && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
          transition={{ duration: 0.5 }}
          className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 selection:bg-white selection:text-black overflow-hidden relative"
        >
          {/* Background Effects */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
                x: [0, 50, 0],
                y: [0, 30, 0]
              }}
              transition={{ repeat: Infinity, duration: 15 }}
              className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/5 blur-[120px] rounded-full" 
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.05, 0.15, 0.05],
                x: [0, -40, 0],
                y: [0, -60, 0]
              }}
              transition={{ repeat: Infinity, duration: 20, delay: 2 }}
              className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/5 blur-[120px] rounded-full" 
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md relative z-10"
          >
            {/* Back Button */}
            {onBack && (
              <button 
                onClick={onBack}
                className="absolute -top-16 left-0 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold text-sm group"
              >
                <motion.div
                  whileHover={{ x: -4 }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Home
                </motion.div>
              </button>
            )}

            {/* Logo */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/20"
              >
                <Zap className="w-8 h-8 text-black fill-black" />
              </motion.div>
              <h1 className="text-3xl font-black tracking-tighter text-white">BLAZE-AI</h1>
            </div>

            {/* Auth Card */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
              
              {isForgotPassword ? (
                <div className="p-8">
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight">Reset Password</h2>
                    <p className="text-zinc-500 text-sm font-medium">Enter your email to receive a reset link.</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl flex items-start gap-3 text-sm font-medium"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                      </motion.div>
                    )}
                    {resetSent && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-2xl flex items-start gap-3 text-sm font-medium"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>Password reset link sent to your email.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleResetPassword}
                      disabled={loading}
                      className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Send Reset Link</span>}
                    </button>
                  </form>

                  <div className="mt-8 text-center">
                    <button
                      onClick={() => { setIsForgotPassword(false); setError(null); setResetSent(false); }}
                      className="text-sm font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex border-b border-zinc-800/50">
                    <button 
                      onClick={() => { setIsLogin(true); setError(null); }}
                      className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all relative ${
                        isLogin ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      Login
                      {isLogin && <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                    </button>
                    <button 
                      onClick={() => { setIsLogin(false); setError(null); }}
                      className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all relative ${
                        !isLogin ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      Register
                      {!isLogin && <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                    </button>
                  </div>

                  <div className="p-8">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl flex items-start gap-3 text-sm font-medium"
                        >
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      
                      <AnimatePresence mode="wait">
                        {!isLogin && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                              <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Password</label>
                          {isLogin && (
                            <button
                              type="button"
                              onClick={() => { setIsForgotPassword(true); setError(null); }}
                              className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                            >
                              Forgot?
                            </button>
                          )}
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                          <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all"
                          />
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {!isLogin && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-6 overflow-hidden"
                          >
                            <div className="space-y-2 pt-1">
                              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                              <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                                <input 
                                  type="password" 
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all"
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-5 h-5 shrink-0 rounded-lg border flex items-center justify-center transition-all ${agreeTerms ? 'bg-white border-white' : 'border-zinc-800 group-hover:border-zinc-600'}`}>
                                {agreeTerms && <Zap className="w-3 h-3 text-black fill-black" />}
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                              />
                              <span className="text-[11px] text-zinc-500 select-none font-medium leading-tight">
                                By creating an account, you agree to BLAZE-AI <span className="text-white hover:underline">Terms & Conditions</span>.
                              </span>
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || googleLoading}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>{isLogin ? 'Login' : 'Create Account'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800/50"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px]">
                        <span className="bg-zinc-950 px-4 text-zinc-600 uppercase tracking-[0.2em] font-black">Or continue with</span>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading || googleLoading}
                      whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-zinc-950 border border-zinc-800 text-white rounded-2xl font-black text-sm hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      {/* Ripple Effect Placeholder */}
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        whileTap={{ scale: 4, opacity: 0.1 }}
                        className="absolute inset-0 bg-white rounded-full pointer-events-none"
                      />
                      
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>Google</span>
                        </>
                      )}

                      {/* Hover Glow */}
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
