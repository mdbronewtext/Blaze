import React, { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'motion/react';
import { 
  User, Globe, Palette, Brain, Lock, Bell, Plug, 
  CreditCard, Database, LifeBuoy, AlertTriangle, 
  ToggleLeft, ToggleRight, Zap, Loader2, X, ArrowLeft, Check,
  RefreshCcw, Pipette
} from 'lucide-react';
import { UserProfile, UserSettings, ThemePreset, CustomColors } from '../types';
import { THEME_PRESETS } from '../lib/themes';

interface SettingsPanelProps {
  user: UserProfile | null;
  settings: UserSettings;
  onClose: () => void;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onLogout: () => void;
  onClearHistory: () => Promise<void>;
  onExportData: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onRedeemCode: (code: string) => Promise<void>;
  onNavigate: (page: any) => void;
  onShowHelp: () => void;
  inline?: boolean;
}

const RedeemSection = memo(({ onRedeem, isProcessing }: { onRedeem: (code: string) => Promise<void>, isProcessing: boolean }) => {
  const [redeemInput, setRedeemInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRedeem = async () => {
    if (!redeemInput || isProcessing) return;
    
    try {
      await onRedeem(redeemInput);
      setRedeemInput('');
      inputRef.current?.blur();
    } catch (error) {
      // Error handled by parent via popup
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Redeem Promo Code</label>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Verifying...
          </motion.div>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <input 
            ref={inputRef}
            type="text" 
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRedeem();
              }
            }}
            disabled={isProcessing}
            placeholder="ENTER-CODE-HERE"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-zinc-700"
          />
          {redeemInput && !isProcessing && (
            <button 
              type="button"
              onClick={() => setRedeemInput('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleRedeem}
          disabled={!redeemInput || isProcessing}
          className="px-8 py-4 bg-white text-black rounded-2xl text-sm font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            'Redeem'
          )}
        </motion.button>
      </div>
      <p className="text-[10px] text-zinc-600 font-medium">Enter a valid promo code to upgrade your plan or add credits.</p>
    </div>
  );
});

const Section = ({ title, icon: Icon, children, danger }: any) => (
  <section className="space-y-4">
    <h3 className={`text-lg font-bold flex items-center gap-2 ${danger ? 'text-red-500' : 'text-white'}`}>
      <Icon className="w-5 h-5" /> {title}
    </h3>
    <div className={`p-6 sm:p-8 rounded-[2rem] border glass-card depth-shadow ${danger ? 'bg-red-500/5 border-red-500/20' : 'border-white/5'} space-y-6`}>
      {children}
    </div>
  </section>
);

const Toggle = ({ label, desc, checked, onChange }: any) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-bold text-white">{label}</p>
      {desc && <p className="text-xs text-zinc-500">{desc}</p>}
    </div>
    <button type="button" onClick={() => onChange(!checked)} className="text-zinc-400 hover:text-white transition-colors shrink-0">
      {checked ? <ToggleRight className="w-8 h-8 text-white" /> : <ToggleLeft className="w-8 h-8 opacity-50" />}
    </button>
  </div>
);

const ButtonRow = ({ label, desc, btnLabel, onClick, danger, isProcessing }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <p className={`text-sm font-bold ${danger ? 'text-red-500' : 'text-white'}`}>{label}</p>
      {desc && <p className="text-xs text-zinc-500">{desc}</p>}
    </div>
    <button 
      type="button" 
      onClick={onClick} 
      disabled={isProcessing}
      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
        danger 
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
          : 'bg-zinc-800 text-white hover:bg-zinc-700'
      } disabled:opacity-50`}
    >
      {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
      {isProcessing ? 'Processing...' : btnLabel}
    </button>
  </div>
);

const SelectGroup = ({ label, options, value, onChange }: any) => (
  <div className="space-y-3">
    <p className="text-sm font-bold text-white">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt: string) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${value === opt ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const ThemeCard = ({ preset, isActive, onClick, colors }: any) => (
  <button
    onClick={() => onClick(preset.id)}
    className={`relative group flex flex-col p-3 rounded-2xl transition-all duration-300 ${
      isActive 
        ? 'scale-[1.02] bg-white/5 border-accent' 
        : 'hover:scale-[1.02] bg-zinc-950/40 border-white/5'
    } border-2 overflow-hidden`}
  >
    <div 
      className="w-full h-20 rounded-xl overflow-hidden border border-white/5 mb-2.5 flex flex-col shadow-inner relative"
      style={{ backgroundColor: preset.colors.bg }}
    >
      <div className="flex-1 p-2.5 space-y-2">
        <div className="w-1/2 h-2.5 rounded-full" style={{ backgroundColor: preset.colors.accent }} />
        <div className="w-full h-10 rounded-xl border border-white/5 shadow-2xl" style={{ backgroundColor: preset.colors.card }} />
      </div>
      {isActive && (
        <motion.div 
          layoutId="active-glow"
          className="absolute inset-0 ring-2 ring-accent ring-inset pointer-events-none"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </div>
    <div className="flex items-center justify-between px-1">
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
        {preset.name}
      </span>
      {isActive && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]"
        >
          <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
        </motion.div>
      )}
    </div>
  </button>
);

const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between group">
    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</label>
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase">{value}</span>
      <div className="relative w-8 h-8 rounded-full border-2 border-white/10 overflow-hidden cursor-pointer hover:border-white/20 transition-all active:scale-90 shadow-xl">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent"
        />
      </div>
    </div>
  </div>
);

export function SettingsPanel({ 
  user, 
  settings,
  onClose, 
  onUpdateUser, 
  onUpdateSettings,
  onLogout, 
  onClearHistory,
  onExportData,
  onDeleteAccount,
  onRedeemCode,
  onNavigate,
  onShowHelp,
  inline = false 
}: SettingsPanelProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string, title: string, desc: string } | null>(null);

  const handleAction = async (type: string) => {
    setIsProcessing(type);
    try {
      if (type === 'clear') {
        await onClearHistory();
      } else if (type === 'export') {
        await onExportData();
      } else if (type === 'delete') {
        await onDeleteAccount();
      }
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRedeem = async (code: string) => {
    setIsProcessing('redeem');
    try {
      await onRedeemCode(code);
    } catch (error) {
      // Error is already handled by the global popup in App.tsx
      // but we catch it here to stop the local loading state
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto pb-24 space-y-12"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('chat')}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
          title="Back to Chat"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-500 group-hover:text-white" />
        </button>
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Settings</h1>
          <p className="text-zinc-500 text-sm">Manage your account, preferences, and integrations.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ACCOUNT */}
        <Section title="Account" icon={User}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">
              {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-full h-full p-4 text-zinc-500" />}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
              <h4 className="text-xl font-bold text-white truncate">{user?.displayName || 'User'}</h4>
              <p className="text-sm text-zinc-400 truncate">{user?.email}</p>
              <p className="text-xs text-zinc-600 font-mono mt-1 truncate">ID: {user?.uid}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-800/50 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => onNavigate('profile')} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors">Edit Profile</button>
            <button type="button" onClick={onLogout} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors">Logout</button>
          </div>
        </Section>

        {/* LANGUAGE */}
        <Section title="Language" icon={Globe}>
          <div className="space-y-3">
            <label className="text-sm font-bold text-white">Interface Language</label>
            <select 
              value={settings.language} 
              onChange={(e) => onUpdateSettings({ language: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-600"
            >
              {['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Arabic', 'Japanese', 'Korean', 'Auto Detect'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* THEMES & APPEARANCE */}
        <Section title="Appearance" icon={Palette}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Theme Presets</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Choose from a collection of premium themes.</p>
                </div>
                {settings.theme !== 'dark' && (
                  <button 
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEME_PRESETS.map((preset) => (
                  <ThemeCard 
                    key={preset.id} 
                    preset={preset} 
                    isActive={settings.theme === preset.id}
                    onClick={(id: ThemePreset) => onUpdateSettings({ theme: id })}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Custom Branding {settings.theme === 'custom' && <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[8px] uppercase tracking-[0.2em] font-black">Active</span>}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Fine-tune your personal space with custom colors.</p>
                </div>
                <Pipette className={`w-4 h-4 ${settings.theme === 'custom' ? 'text-accent animate-pulse' : 'text-zinc-600'}`} />
              </div>
              
              <div className="p-5 rounded-3xl bg-black/20 border border-white/5 space-y-5">
                <ColorPicker 
                  label="Accent Color" 
                  value={settings.customColors?.accent || '#3b82f6'} 
                  onChange={(v) => onUpdateSettings({ theme: 'custom', customColors: { ...settings.customColors!, accent: v } })} 
                />
                <ColorPicker 
                  label="Background Color" 
                  value={settings.customColors?.bg || '#09090b'} 
                  onChange={(v) => onUpdateSettings({ theme: 'custom', customColors: { ...settings.customColors!, bg: v } })} 
                />
                <ColorPicker 
                  label="Card Background" 
                  value={settings.customColors?.card || '#18181b'} 
                  onChange={(v) => onUpdateSettings({ theme: 'custom', customColors: { ...settings.customColors!, card: v } })} 
                />
                <ColorPicker 
                  label="Text Color" 
                  value={settings.customColors?.text || '#fafafa'} 
                  onChange={(v) => onUpdateSettings({ theme: 'custom', customColors: { ...settings.customColors!, text: v } })} 
                />
              </div>
              
              {settings.theme === 'custom' && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-accent font-bold uppercase tracking-widest text-center"
                >
                  ✨ Custom branding applied in real-time
                </motion.p>
              )}
            </div>

            <div className="h-px bg-white/5" />
            
            <SelectGroup 
              label="Font Size" 
              options={['Small', 'Medium', 'Large']} 
              value={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)} 
              onChange={(v: string) => onUpdateSettings({ fontSize: v.toLowerCase() as any })} 
            />
          </div>
        </Section>

        {/* AI SETTINGS */}
        <Section title="AI Settings" icon={Brain}>
          <SelectGroup label="Mode" options={['Fast', 'Smart', 'Pro']} value={settings.aiMode.charAt(0).toUpperCase() + settings.aiMode.slice(1)} onChange={(v: string) => onUpdateSettings({ aiMode: v.toLowerCase() as any })} />
          <div className="h-px bg-zinc-800/50" />
          <SelectGroup label="Response Style" options={['Short', 'Detailed', 'Step-by-step']} value={settings.responseStyle.charAt(0).toUpperCase() + settings.responseStyle.slice(1)} onChange={(v: string) => onUpdateSettings({ responseStyle: v.toLowerCase() as any })} />
        </Section>

        {/* PRIVACY & SECURITY */}
        <Section title="Privacy & Security" icon={Lock}>
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-blue-400" />
            <p className="text-xs font-medium text-blue-400/80">Your data is private and encrypted. Only you can access your conversations. 🔒</p>
          </div>
          <Toggle 
            label="Privacy Mode" 
            desc="Store memory only temporarily during this session. Messages will not be saved to the cloud." 
            checked={settings.privacyMode} 
            onChange={(v: boolean) => onUpdateSettings({ privacyMode: v })} 
          />
          <div className="h-px bg-zinc-800/50" />
          <Toggle label="Save Chat History" desc="Keep a record of your conversations in the cloud (Encrypted)." checked={settings.saveHistory} onChange={(v: boolean) => onUpdateSettings({ saveHistory: v })} />
          <div className="h-px bg-zinc-800/50" />
          <Toggle label="Personalization" desc="Allow AI to learn from your preferences." checked={settings.personalization} onChange={(v: boolean) => onUpdateSettings({ personalization: v })} />
          <div className="h-px bg-zinc-800/50" />
          <ButtonRow label="Change Password" desc="Update your account password securely." btnLabel="Change Password" onClick={() => alert('Password reset email sent.')} />
          <div className="h-px bg-zinc-800/50" />
          <ButtonRow 
            label="Two-Factor Authentication" 
            desc="Add an extra layer of security to your account." 
            btnLabel={user?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"} 
            onClick={() => onUpdateUser({ twoFactorEnabled: !user?.twoFactorEnabled })} 
          />
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications" icon={Bell}>
          <Toggle label="Email Notifications" desc="Receive updates and tips via email." checked={settings.emailNotifications} onChange={(v: boolean) => onUpdateSettings({ emailNotifications: v })} />
          <div className="h-px bg-zinc-800/50" />
          <Toggle label="Sound Alerts" desc="Play sounds for incoming messages." checked={settings.soundAlerts} onChange={(v: boolean) => onUpdateSettings({ soundAlerts: v })} />
        </Section>

        {/* INTEGRATIONS */}
        <Section title="Integrations" icon={Plug}>
          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center"><Globe className="w-5 h-5 text-black" /></div>
              <div>
                <p className="text-sm font-bold text-white">Google Account</p>
                <p className="text-xs text-green-500">Connected</p>
              </div>
            </div>
            <button type="button" className="text-xs font-bold text-zinc-500 hover:text-white">Manage</button>
          </div>
          <div className="space-y-3 pt-2">
            <label className="text-sm font-bold text-white">Custom API Key (Optional)</label>
            <input 
              type="password" 
              value={settings.apiKey}
              onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-500">Use your own API key to bypass rate limits.</p>
          </div>
        </Section>

        {/* SUBSCRIPTION */}
        <Section title="Subscription" icon={CreditCard}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Current Plan</p>
              <p className="text-3xl font-black text-white mt-1">{user?.plan || 'Free'}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/50 space-y-4">
            <RedeemSection 
              onRedeem={handleRedeem} 
              isProcessing={isProcessing === 'redeem'} 
            />
          </div>

          <div className="pt-4 border-t border-zinc-800/50 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => onNavigate('pricing')} className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors">Upgrade Plan</button>
            <button type="button" className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors">Manage Plan</button>
          </div>
        </Section>

        {/* DATA & STORAGE */}
        <Section title="Data & Storage" icon={Database}>
          <ButtonRow 
            label="Clear Chat History" 
            desc="Permanently delete all conversations." 
            btnLabel="Clear Data" 
            onClick={() => setConfirmAction({ type: 'clear', title: 'Clear History', desc: 'Are you sure you want to delete all your chat history? This cannot be undone.' })} 
            danger 
            isProcessing={isProcessing === 'clear'}
          />
          <div className="h-px bg-zinc-800/50" />
          <ButtonRow 
            label="Export Data" 
            desc="Download a copy of your data." 
            btnLabel="Download Data" 
            onClick={() => handleAction('export')} 
            isProcessing={isProcessing === 'export'}
          />
        </Section>

        {/* SUPPORT */}
        <Section title="Support" icon={LifeBuoy}>
          <ButtonRow label="Help Center" desc="Read guides and documentation." btnLabel="Open Help" onClick={onShowHelp} />
          <div className="h-px bg-zinc-800/50" />
          <ButtonRow label="Contact Support" desc="Get help from our team." btnLabel="Contact Us" onClick={() => onNavigate('support')} />
        </Section>

        {/* ACCOUNT ACTIONS */}
        <Section title="Account Actions" icon={AlertTriangle} danger>
          <ButtonRow label="Logout" desc="Sign out of your account on this device." btnLabel="Logout" onClick={onLogout} danger />
          <div className="h-px bg-red-500/10" />
          <ButtonRow 
            label="Delete Account" 
            desc="Permanently delete your account and all data." 
            btnLabel="Delete Account" 
            onClick={() => setConfirmAction({ type: 'delete', title: 'Delete Account', desc: 'This will permanently delete your account and all associated data. This action is irreversible.' })} 
            danger 
            isProcessing={isProcessing === 'delete'}
          />
        </Section>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">{confirmAction.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{confirmAction.desc}</p>
            </div>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => handleAction(confirmAction.type)}
                disabled={isProcessing !== null}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
              <button 
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isProcessing !== null}
                className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
