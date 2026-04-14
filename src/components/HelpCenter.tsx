import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  User, 
  CreditCard, 
  Zap, 
  Shield, 
  AlertCircle, 
  MessageSquare, 
  Bug, 
  ArrowUpCircle,
  ArrowLeft,
  X,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

interface HelpArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

const HELP_ARTICLES: HelpArticle[] = [
  // Getting Started
  {
    id: 'gs-1',
    category: 'Getting Started',
    question: 'What is Blaze-AI?',
    answer: 'Blaze-AI is a next-generation AI SaaS platform that provides access to multiple state-of-the-art AI models for chat, coding, image generation, and research. It features a unified interface with advanced memory and 3D UI capabilities.',
    tags: ['intro', 'about', 'blaze-ai']
  },
  {
    id: 'gs-2',
    category: 'Getting Started',
    question: 'How do I start a new chat?',
    answer: 'Simply click the "New Chat" button in the sidebar or use the dashboard shortcuts. You can choose between different AI modes (Lite, Smart, Beast) depending on your needs.',
    tags: ['chat', 'start', 'new']
  },
  // Account & Login
  {
    id: 'acc-1',
    category: 'Account & Login',
    question: 'How can I change my profile picture?',
    answer: 'Go to the Profile section in the sidebar. You can update your display name and your profile picture will be automatically synced with your Google account.',
    tags: ['profile', 'avatar', 'photo']
  },
  {
    id: 'acc-2',
    category: 'Account & Login',
    question: 'Is my data secure?',
    answer: 'Yes, we take security seriously. All conversations are encrypted, and we offer a "Privacy Mode" that ensures your chat history is not saved to our servers.',
    tags: ['security', 'privacy', 'data']
  },
  // Plans & Payments
  {
    id: 'pay-1',
    category: 'Plans & Payments',
    question: 'How to upgrade my plan?',
    answer: 'Click on "Pricing" in the sidebar or "Upgrade" in the settings. You can choose between Pro, Plus, and Elite plans with different daily limits and features.',
    tags: ['upgrade', 'billing', 'subscription']
  },
  {
    id: 'pay-2',
    category: 'Plans & Payments',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can manage your subscription from the billing section. If you cancel, you will retain access to your plan features until the end of the current billing cycle.',
    tags: ['cancel', 'refund', 'billing']
  },
  // Redeem Codes
  {
    id: 'red-1',
    category: 'Redeem Codes',
    question: 'How to use a redeem code?',
    answer: 'Go to Settings > Billing. Enter your code in the "Redeem Code" field and click "Apply". Your account will be instantly upgraded or credited.',
    tags: ['redeem', 'code', 'coupon', 'promo']
  },
  // Features
  {
    id: 'feat-1',
    category: 'Features',
    question: 'How does Vision AI work?',
    answer: 'Vision AI allows you to upload images and ask questions about them. The AI can describe scenes, read text from images, and even help with debugging UI screenshots.',
    tags: ['vision', 'image', 'upload']
  },
  {
    id: 'feat-2',
    category: 'Features',
    question: 'What is the "Memory" feature?',
    answer: 'Memory allows the AI to remember important facts about you, your preferences, and previous instructions across different chat threads, creating a more personalized experience.',
    tags: ['memory', 'personalization', 'context']
  },
  // Troubleshooting
  {
    id: 'tr-1',
    category: 'Troubleshooting',
    question: 'Why is my microphone not working?',
    answer: 'Ensure you have granted microphone permissions to the browser. Check your system settings to make sure the correct input device is selected. Try refreshing the page if the issue persists.',
    tags: ['mic', 'voice', 'audio', 'error']
  },
  {
    id: 'tr-2',
    category: 'Troubleshooting',
    question: 'The AI is not responding, what should I do?',
    answer: 'Check your internet connection. If you are on a free plan, you might have reached your daily limit. You can check your usage in the dashboard.',
    tags: ['slow', 'response', 'limit', 'error']
  }
];

const CATEGORIES = [
  { name: 'Getting Started', icon: BookOpen },
  { name: 'Account & Login', icon: User },
  { name: 'Plans & Payments', icon: CreditCard },
  { name: 'Redeem Codes', icon: Zap },
  { name: 'Features', icon: SparklesIcon },
  { name: 'Troubleshooting', icon: AlertCircle },
  { name: 'Privacy & Security', icon: Shield }
];

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

interface HelpCenterProps {
  onClose: () => void;
  onNavigate: (page: any) => void;
}

export function HelpCenter({ onClose, onNavigate }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    return HELP_ARTICLES.filter(article => {
      const matchesSearch = 
        article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !activeCategory || article.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl h-full max-h-[90vh] glass-panel border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden depth-shadow"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors group"
              title="Back"
            >
              <ArrowLeft className="w-6 h-6 text-zinc-500 group-hover:text-white" />
            </button>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <HelpCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Help Center</h2>
              <p className="text-zinc-400 text-sm">Find answers and learn how to use Blaze-AI</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1 scrollbar-hide">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics, features, or troubleshooting..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickActionButton 
              icon={<MessageSquare className="w-5 h-5" />}
              label="Contact Support"
              onClick={() => { onNavigate('support'); onClose(); }}
              color="blue"
            />
            <QuickActionButton 
              icon={<Bug className="w-5 h-5" />}
              label="Report a Bug"
              onClick={() => { onNavigate('support'); onClose(); }}
              color="red"
            />
            <QuickActionButton 
              icon={<ArrowUpCircle className="w-5 h-5" />}
              label="Upgrade Plan"
              onClick={() => { onNavigate('pricing'); onClose(); }}
              color="amber"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
              <span>Categories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  activeCategory === null 
                    ? 'bg-white text-black border-white' 
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                }`}
              >
                All Topics
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${
                    activeCategory === cat.name 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
              <span>{activeCategory || 'Frequently Asked Questions'}</span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredArticles.length > 0 ? (
                  filteredArticles.map(article => (
                    <FAQItem 
                      key={article.id}
                      article={article}
                      isExpanded={expandedId === article.id}
                      onToggle={() => toggleExpand(article.id)}
                    />
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                      <Search className="w-8 h-8 text-zinc-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold">No results found</p>
                      <p className="text-zinc-500 text-sm">Try searching for something else or browse categories.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fallback */}
          <div className="pt-10 pb-6 text-center border-t border-white/5">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Still need help?</h4>
                <p className="text-zinc-500 text-sm">Our support team is available 24/7 to assist you with any questions or technical issues.</p>
              </div>
              <button
                onClick={() => { onNavigate('support'); onClose(); }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all 3d-button shadow-xl"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Support Team
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: 'blue' | 'red' | 'amber' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all 3d-button ${colors[color]}`}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
    </button>
  );
}

function FAQItem({ article, isExpanded, onToggle }: { article: HelpArticle, isExpanded: boolean, onToggle: () => void }) {
  return (
    <motion.div 
      layout
      className={`glass-card border rounded-2xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">
            {article.category}
          </span>
          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
            {article.question}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 pt-2 text-zinc-400 text-sm leading-relaxed border-t border-white/5">
              {article.answer}
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
