import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap, Star, Shield, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { Plan, UserProfile, PlanSettings, PLAN_ORDER } from '../types';
import { ThreeDCard } from './ThreeDCard';

interface PricingPanelProps {
  user: UserProfile | null;
  planSettings: Record<string, PlanSettings>;
  onClose: () => void;
  onUpgrade: (plan: Plan) => void;
}

export function PricingPanel({ user, planSettings, onClose, onUpgrade }: PricingPanelProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const plans: { id: Plan; name: string; icon: any; color: string; desc: string }[] = [
    { id: 'FREE', name: 'Free', icon: Zap, color: 'text-zinc-400', desc: 'Basic AI access for casual users.' },
    { id: 'PRO', name: 'Pro', icon: Star, color: 'text-blue-400', desc: 'Advanced tools for professionals.' },
    { id: 'PLUS', name: 'Plus', icon: Shield, color: 'text-amber-400', desc: 'Priority access and extended limits.' },
    { id: 'ELITE', name: 'Elite', icon: Zap, color: 'text-purple-400', desc: 'Unlimited power for power users.' }
  ];

  const handlePlanAction = async (planId: Plan) => {
    const currentPlan = user?.plan || 'FREE';
    const currentIndex = PLAN_ORDER[currentPlan];
    const newIndex = PLAN_ORDER[planId];

    if (newIndex < currentIndex) {
      setConfirmPlan(planId);
    } else {
      setIsProcessing(true);
      await onUpgrade(planId);
      setIsProcessing(false);
    }
  };

  const confirmDowngrade = async () => {
    if (!confirmPlan) return;
    setIsProcessing(true);
    await onUpgrade(confirmPlan);
    setIsProcessing(false);
    setConfirmPlan(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel border border-white/10 rounded-[2rem] w-full max-w-6xl max-h-[90vh] overflow-y-auto relative depth-shadow"
      >
        <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Upgrade Your Plan</h2>
            <p className="text-zinc-400 mt-1">Unlock the full potential of Blaze-AI.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 p-1 rounded-xl flex items-center">
              <button 
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isYearly ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Monthly
              </button>
              <button 
                type="button"
                onClick={() => setIsYearly(true)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isYearly ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Yearly <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Save 20%</span>
              </button>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const settings = planSettings[p.id];
            if (!settings || !settings.isEnabled) return null;

            const getPrice = (id: Plan) => {
              switch(id) {
                case 'PRO': return 2.99;
                case 'PLUS': return 5.99;
                case 'ELITE': return 10.99;
                default: return 0;
              }
            };

            const basePrice = getPrice(p.id);
            const price = isYearly ? (basePrice * 12 * 0.8).toFixed(2) : basePrice.toFixed(2);
            const limit = settings.dailyLimit;
            const features = settings.features;
            const isDowngrade = PLAN_ORDER[p.id] < PLAN_ORDER[user?.plan || 'FREE'];

            return (
              <ThreeDCard 
                key={p.id}
                className={`flex flex-col h-full ${isCurrent ? 'border-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]' : 'border-white/5'}`}
              >
                <div className={`relative glass-card border rounded-3xl p-6 flex flex-col h-full transition-all duration-300 ${isCurrent ? 'border-amber-500/50' : 'border-white/5 hover:border-white/10'}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                      Current Plan
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <p.icon className={`w-8 h-8 ${p.color} mb-4`} />
                    <h3 className="text-xl font-black text-white">{p.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 h-8">{p.desc}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">${price}</span>
                    <span className="text-zinc-500 text-sm">/{isYearly ? 'yr' : 'mo'}</span>
                  </div>

                  <div className="space-y-4 flex-1 mb-8">
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{limit >= 1000 ? 'Unlimited' : limit} Requests / day</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      {features.chat ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className={features.chat ? '' : 'text-zinc-600'}>AI Chat Assistant</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      {features.code ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className={features.code ? '' : 'text-zinc-600'}>Code Master</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      {features.image ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className={features.image ? '' : 'text-zinc-600'}>Vision AI</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      {features.tools ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className={features.tools ? '' : 'text-zinc-600'}>Automation Tools</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="capitalize">{settings.speed} speed</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{settings.maxTokens.toLocaleString()} tokens/resp</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => handlePlanAction(p.id)}
                    disabled={isCurrent || isProcessing}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 3d-button glow-hover ${
                      isCurrent 
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                        : isDowngrade 
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5'
                          : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    {isProcessing && !isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isCurrent ? 'Active' : isDowngrade ? 'Downgrade' : 'Upgrade'} 
                        {!isCurrent && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                </div>
              </ThreeDCard>
            );
          })}
        </div>

        {/* Downgrade Confirmation Modal */}
        <AnimatePresence>
          {confirmPlan && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                
                <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Confirm Downgrade ⚠️</h3>
                <p className="text-zinc-400 text-center mb-8 leading-relaxed">
                  You are downgrading from <span className="text-white font-bold">{user?.plan}</span> to <span className="text-white font-bold">{confirmPlan}</span>.
                  You may lose access to premium features. Continue?
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmPlan(null)}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDowngrade}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Downgrade'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
