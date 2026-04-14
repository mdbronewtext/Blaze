import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ArrowRight, 
  MessageSquare, 
  Code2, 
  ImageIcon, 
  Box, 
  Brain, 
  Check, 
  Star, 
  Shield, 
  Crown,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Plan } from '../types';
import { PLAN_PRICING, PLAN_FEATURES, PLAN_LIMITS } from '../lib/subscription';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "AI Chat Assistant",
      desc: "Engage with multiple state-of-the-art models including Claude 3.5, GPT-4o, and DeepSeek.",
      icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
      color: "blue"
    },
    {
      title: "Code Master",
      desc: "Generate, debug, and optimize code across 20+ languages with specialized coding intelligence.",
      icon: <Code2 className="w-6 h-6 text-emerald-400" />,
      color: "emerald"
    },
    {
      title: "Vision AI",
      desc: "Analyze images, extract text from documents, and generate stunning visual content.",
      icon: <ImageIcon className="w-6 h-6 text-purple-400" />,
      color: "purple"
    },
    {
      title: "Automation Tools",
      desc: "Streamline your workflow with built-in productivity tools and memory systems.",
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      color: "amber"
    },
    {
      title: "Multi-Module System",
      desc: "Switch seamlessly between specialized modules tailored for different tasks.",
      icon: <Box className="w-6 h-6 text-rose-400" />,
      color: "rose"
    }
  ];

  const plans: { id: Plan; name: string; icon: any; color: string; desc: string; recommended?: boolean }[] = [
    { id: 'FREE', name: 'Free', icon: Zap, color: 'text-zinc-400', desc: 'Basic AI access for casual users.' },
    { id: 'PRO', name: 'Pro', icon: Star, color: 'text-blue-400', desc: 'Advanced tools for professionals.' },
    { id: 'PLUS', name: 'Plus', icon: Shield, color: 'text-amber-400', desc: 'Priority access and extended limits.', recommended: true },
    { id: 'ELITE', name: 'Elite', icon: Zap, color: 'text-purple-400', desc: 'Unlimited power for power users.' }
  ];

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white selection:bg-white selection:text-black font-sans">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-white/10 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-black text-xl tracking-tighter">BLAZE-AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button type="button" onClick={() => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">About</button>
            <button type="button" onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Features</button>
            <button type="button" onClick={() => { document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Plans</button>
            <button type="button" onClick={onLogin} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Login</button>
            <button 
              type="button"
              onClick={onGetStarted}
              className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
            >
              Get Started
            </button>
          </div>

          <button type="button" className="md:hidden p-2 text-zinc-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[90] bg-zinc-950 pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              <button type="button" onClick={() => { setIsMenuOpen(false); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-2xl font-black text-white text-left">About</button>
              <button type="button" onClick={() => { setIsMenuOpen(false); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-2xl font-black text-white text-left">Features</button>
              <button type="button" onClick={() => { setIsMenuOpen(false); document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-2xl font-black text-white text-left">Plans</button>
              <div className="h-px bg-zinc-800 my-2" />
              <button type="button" onClick={onLogin} className="text-2xl font-black text-zinc-400 text-left">Login</button>
              <button 
                type="button"
                onClick={onGetStarted}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-[120px] rounded-full pointer-events-none" />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 10 }}
          className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ repeat: Infinity, duration: 12, delay: 1 }}
          className="absolute top-48 right-1/4 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" 
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Now with Claude 3.5 & GPT-4o
              </span>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white">
                Blaze-AI – Next Generation <span className="text-zinc-500">AI Platform</span>
              </h1>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-medium"
            >
              Chat, Code, Create, and Automate with one powerful AI. The ultimate workspace for developers and creators.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <button 
                type="button"
                onClick={onGetStarted}
                className="w-full sm:w-auto px-10 py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-2xl shadow-white/10"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={onLogin}
                className="w-full sm:w-auto px-10 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-black text-lg hover:bg-zinc-800 transition-all active:scale-95"
              >
                Login
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">One Platform. <br /><span className="text-zinc-500">Infinite Possibilities.</span></h2>
                <p className="text-lg text-zinc-400 leading-relaxed font-medium">
                  Blaze-AI is an advanced AI platform that combines chat, coding, image generation, and automation tools into one powerful system. It helps developers, creators, and businesses work faster and smarter using AI.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl space-y-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-bold">Smart Memory</h4>
                  <p className="text-xs text-zinc-500">AI that remembers your preferences and context across sessions.</p>
                </div>
                <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl space-y-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-bold">Lightning Fast</h4>
                  <p className="text-xs text-zinc-500">Optimized infrastructure for near-instant AI responses.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-[3rem] border border-zinc-800 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/ai/800/800')] opacity-20 grayscale" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-white/20 animate-bounce">
                    <Zap className="w-12 h-12 text-black fill-black" />
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -top-6 -right-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-bold">Chat Active</span>
                </div>
              </motion.div>
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                className="absolute -bottom-6 -left-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold">Code Optimized</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Powerful Features</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto font-medium">Everything you need to supercharge your productivity in one place.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] space-y-6 hover:border-zinc-700 transition-all group"
              >
                <div className={`w-14 h-14 bg-${f.color}-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">{f.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed font-medium">{f.desc}</p>
                </div>
                <button type="button" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                  Learn More <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Simple Pricing</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto font-medium">Choose the plan that fits your needs. No hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const pricing = PLAN_PRICING[plan.id as keyof typeof PLAN_PRICING];
              const featuresList = PLAN_FEATURES[plan.id as keyof typeof PLAN_FEATURES];
              const limit = PLAN_LIMITS[plan.id as keyof typeof PLAN_LIMITS];

              return (
                <div 
                  key={plan.id}
                  className={`relative bg-zinc-900/30 border rounded-[2.5rem] p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.recommended ? 'border-amber-500/50 shadow-[0_0_50px_-10px_rgba(245,158,11,0.15)]' : 'border-zinc-800'}`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                      Recommended
                    </div>
                  )}
                  
                  <div className="mb-8">
                    <plan.icon className={`w-10 h-10 ${plan.color} mb-4`} />
                    <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{plan.desc}</p>
                  </div>

                  <div className="mb-8">
                    <span className="text-4xl font-black text-white">₹{pricing.monthly}</span>
                    <span className="text-zinc-500 text-sm">/mo</span>
                  </div>

                  <div className="space-y-4 flex-1 mb-10">
                    <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{limit === 1000 ? 'Unlimited' : limit} Requests / day</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="capitalize">{featuresList.modules.join(', ')} modules</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{featuresList.speed} speed</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={onGetStarted}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                      plan.recommended 
                        ? 'bg-amber-500 text-black hover:bg-amber-400' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-800 rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://picsum.photos/seed/cta/1200/400')] opacity-10 grayscale pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight">Start using Blaze-AI today</h2>
              <p className="text-zinc-400 max-w-xl mx-auto text-lg font-medium">Join thousands of developers and creators building the future with Blaze-AI.</p>
              <div className="pt-4">
                <button 
                  type="button"
                  onClick={onGetStarted}
                  className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl shadow-white/10"
                >
                  Get Started for Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="font-black text-lg tracking-tighter">BLAZE-AI</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-zinc-500">
            <button type="button" className="hover:text-white transition-colors">Privacy</button>
            <button type="button" className="hover:text-white transition-colors">Terms</button>
            <button type="button" className="hover:text-white transition-colors">Twitter</button>
            <button type="button" className="hover:text-white transition-colors">GitHub</button>
          </div>
          <p className="text-sm text-zinc-600 font-medium">© 2026 Blaze-AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
