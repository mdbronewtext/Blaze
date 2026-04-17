import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  increment,
  updateDoc
} from 'firebase/firestore';
import { auth, db, signInWithPopup, googleProvider, signOut, handleFirestoreError } from './firebase';
import { UserProfile, ChatThread, Message, MemoryItem, OperationType, PlanSettings, Plan, AppSettings, UserSettings, AIMode, AIModel, RedeemCode, Attachment, FirestoreErrorInfo, PLAN_ORDER } from './types';
import { encrypt, decrypt, getEncryptionKey } from './lib/crypto';
import { checkUsageLimit, canAccessModel, PLAN_LIMITS } from './lib/subscription';
import { Sidebar } from './components/Sidebar';
import { NotificationBell } from './components/NotificationBell';
import { BroadcastBanner } from './components/BroadcastBanner';
import { ChatInterface } from './components/ChatInterface';
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const ProfilePanel = lazy(() => import('./components/ProfilePanel').then(m => ({ default: m.ProfilePanel })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SupportPanel = lazy(() => import('./components/SupportPanel').then(m => ({ default: m.SupportPanel })));
const PricingPanel = lazy(() => import('./components/PricingPanel').then(m => ({ default: m.PricingPanel })));
const HelpCenter = lazy(() => import('./components/HelpCenter').then(m => ({ default: m.HelpCenter })));
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { VerificationScreen } from './components/VerificationScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyTheme } from './lib/themes';
import { AnimatePresence, motion } from 'motion/react';
import { Zap, AlertTriangle, CheckCircle, X, Ban } from 'lucide-react';

const OWNER_EMAILS = ['officialdevloper19995@gmail.com', 'priyanshukumarrxl948@gmail.com'];

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  customColors: {
    accent: '#3b82f6',
    bg: '#09090b',
    text: '#fafafa',
    card: '#18181b'
  },
  fontSize: 'medium',
  aiMode: 'smart',
  responseStyle: 'detailed',
  saveHistory: true,
  privacyMode: false,
  personalization: true,
  emailNotifications: true,
  soundAlerts: false,
  apiKey: '',
  language: 'English'
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [activePage, setActivePage] = useState<'chat' | 'settings' | 'profile' | 'admin' | 'pricing' | 'tools' | 'support'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [currentMode, setCurrentMode] = useState<AIMode>('lite');
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem('selectedAIModel');
    return saved ? saved : 'openai/gpt-4.1';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [planSettings, setPlanSettings] = useState<Record<string, PlanSettings>>({});
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [popup, setPopup] = useState<{ show: boolean; type: 'success' | 'error'; message: string; plan?: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Apply Theme
  useEffect(() => {
    applyTheme(userSettings.theme, userSettings.customColors);
  }, [userSettings.theme, userSettings.customColors]);
  
  const DEFAULT_MODELS = [
    { id: "kyvex", name: "Kyvex", description: "Fast & Smart", icon: "⚡", type: "api", enabled: true },
    { id: "claude-sonnet-4.5", name: "Claude-sonnet-4.5", description: "Advanced Intelligence", icon: "🧠", type: "api", enabled: true },
    { id: "gpt-5", name: "GPT-5", description: "Multi AI", icon: "🤖", type: "api", enabled: true },
    { id: "gemini-2.5-pro", name: "Gemini-2.5-pro", description: "Multi AI", icon: "✨", type: "api", enabled: true },
    { id: "grok-4", name: "Grok 4", description: "Multi AI", icon: "⚡", type: "api", enabled: true },
    { id: "gemini-imagen-4", name: "Gemini-imagen-4", description: "Multi AI", icon: "🎨", type: "api", enabled: true },
    { id: "openai/gpt-4.1", name: "GPT-4.1", description: "GitHub AI", icon: "💬", type: "github", enabled: true },
    { id: "xai/grok-3", name: "Grok 3", description: "GitHub AI", icon: "🌌", type: "github", enabled: true }
  ];

  const [aiModels, setAiModels] = useState(() => {
    const saved = localStorage.getItem("models");
    if (!saved) return DEFAULT_MODELS;
    const models = JSON.parse(saved);
    // Ensure new models from DEFAULT_MODELS are added to the saved list
    const missingModels = DEFAULT_MODELS.filter(dm => !models.some((m: any) => m.id === dm.id));
    if (missingModels.length > 0) {
      const updated = [...models, ...missingModels];
      localStorage.setItem("models", JSON.stringify(updated));
      return updated;
    }
    return models;
  });

  const toggleModel = (id: string) => {
    const updated = aiModels.map(m => m.id === id ? { ...m, enabled: m.enabled === false ? true : false } : m);
    setAiModels(updated);
    localStorage.setItem("models", JSON.stringify(updated));
  };

  useEffect(() => {
    const activeModels = aiModels.filter(m => m.enabled !== false);
    const isSelectedActive = activeModels.some(m => m.id === selectedAIModel);
    
    if (!isSelectedActive && activeModels.length > 0) {
      setSelectedAIModel(activeModels[0].id);
      localStorage.setItem('selectedAIModel', activeModels[0].id);
      if (user) {
        handleUpdateUser({ selectedModel: activeModels[0].id });
      }
    }
  }, [aiModels, selectedAIModel, user]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef<HTMLDivElement>(null);

  const showComingSoonPopup = () => {
    setShowComingSoon(true);
    setTimeout(() => {
      setShowComingSoon(false);
    }, 2000);
  };

  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        if (parallaxRef.current) {
          const x = (e.clientX / window.innerWidth - 0.5) * 20;
          const y = (e.clientY / window.innerHeight - 0.5) * 20;
          parallaxRef.current.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
        }
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleNavigate = (page: 'chat' | 'settings' | 'profile' | 'admin' | 'pricing' | 'tools' | 'support') => {
    setIsNavigating(true);
    setTimeout(() => {
      setActivePage(page);
      setIsNavigating(false);
    }, 300);
  };

  // Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsInitialLoading(true);
      if (firebaseUser) {
        setIsVerified(firebaseUser.emailVerified);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (readError) {
            console.warn("Could not read user doc, attempting to create...", readError);
          }

          if (userDoc && userDoc.exists()) {
            const userData = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
            
            // Update last login
            await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
            
            // Daily Reset Logic
            const today = new Date().toDateString();
            const lastResetDate = userData.lastReset 
              ? (userData.lastReset.toDate ? userData.lastReset.toDate().toDateString() : new Date(userData.lastReset).toDateString()) 
              : '';
            
            if (today !== lastResetDate) {
              await setDoc(userDocRef, { 
                dailyUsage: 0, 
                lastReset: serverTimestamp() 
              }, { merge: true });
              userData.dailyUsage = 0;
              userData.lastReset = new Date();
            }

            // Auto-assign owner role if email matches
            if (OWNER_EMAILS.includes(userData.email)) {
              if (userData.role !== 'owner' || userData.plan !== 'OWNER') {
                userData.role = 'owner';
                userData.plan = 'OWNER';
                await setDoc(userDocRef, { role: 'owner', plan: 'OWNER' }, { merge: true });
              }
            }
            // Migration for old model values
            if (userData.selectedModel === 'gpt' as any || userData.selectedModel === 'gpt5' as any) {
              userData.selectedModel = 'gpt4o';
              await setDoc(userDocRef, { selectedModel: 'gpt4o' }, { merge: true });
            }
            setUser(userData);
            setCurrentMode(userData.mode || 'lite');
            setSelectedAIModel(userData.selectedModel || 'auto');
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              plan: OWNER_EMAILS.includes(firebaseUser.email || '') ? 'OWNER' : 'FREE',
              role: OWNER_EMAILS.includes(firebaseUser.email || '') ? 'owner' : 'user',
              status: 'active',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              theme: 'dark',
              mode: 'lite',
              selectedModel: 'auto',
              credits: 0,
              dailyUsage: 0,
              totalUsage: 0,
              lastReset: serverTimestamp()
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setIsVerified(true);
      }
      setLoading(false);
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch User Profile (Real-time)
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const userData = { uid: user.uid, ...snapshot.data() } as UserProfile;
        setUser(userData);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch User Settings
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<UserSettings>;
        const key = getEncryptionKey(user.uid);
        
        // Decrypt API key if present
        if (data.apiKey) {
          data.apiKey = decrypt(data.apiKey, key);
        }
        
        const merged = { ...DEFAULT_SETTINGS, ...userSettings, ...data };
        setUserSettings(merged);
        localStorage.setItem('settings', JSON.stringify(merged));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/config`));
    return () => unsubscribe();
  }, [user?.uid]);

  // Save selectedAIModel to localStorage
  useEffect(() => {
    localStorage.setItem('selectedAIModel', selectedAIModel);
  }, [selectedAIModel]);

  // Fetch Threads
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'threads'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedThreads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatThread));
      // Sort in memory: Pinned first, then by updatedAt desc
      const sortedThreads = fetchedThreads.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds * 1000 || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds * 1000 || 0;
        return timeB - timeA;
      });
      setChats(sortedThreads);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'threads'));
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch Messages
  useEffect(() => {
    if (!user || !currentChatId) {
      setMessages([]);
      return;
    }
    
    // Only listen to Firestore if history is enabled
    if (userSettings.saveHistory && !userSettings.privacyMode) {
      const q = query(collection(db, 'chats'), where('threadId', '==', currentChatId), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const key = getEncryptionKey(user.uid);
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data() as Message;
          return { 
            id: doc.id, 
            ...data,
            message: decrypt(data.message, key)
          } as Message;
        }).sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
          return timeA - timeB;
        });
        setMessages(msgs);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));
      return () => unsubscribe();
    }
  }, [user?.uid, currentChatId, userSettings.saveHistory, userSettings.privacyMode]);

  // Fetch App Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'appSettings', 'global'), (doc) => {
      if (doc.exists()) {
        setAppSettings(doc.data() as AppSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'appSettings/global'));
    return () => unsubscribe();
  }, []);

  // Fetch Plan Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'planSettings'), (snapshot) => {
      const settings: Record<string, PlanSettings> = {};
      snapshot.docs.forEach(doc => {
        settings[doc.id] = { id: doc.id as Plan, ...doc.data() } as PlanSettings;
      });
      setPlanSettings(settings);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'planSettings'));
    return () => unsubscribe();
  }, []);

  // Fetch Memories
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'memories'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMemories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'memories'));
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('blaze_auth_status');
      setShowAuth(false);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleRedeemCode = async (code: string) => {
    if (!user) return;
    try {
      const redeemRef = doc(db, 'redeem', code);
      const redeemSnap = await getDoc(redeemRef);
      
      if (!redeemSnap.exists()) { 
        setPopup({ show: true, type: 'error', message: 'Invalid code ❌' });
        return; 
      }

      const redeemData = redeemSnap.data() as RedeemCode;
      
      // Check expiry
      if (redeemData.expiryDate) {
        const expiry = redeemData.expiryDate.toDate ? redeemData.expiryDate.toDate() : new Date(redeemData.expiryDate);
        if (new Date() > expiry) { 
          setPopup({ show: true, type: 'error', message: 'Code expired ⏳' });
          return; 
        }
      }

      // Check usage limit
      if (redeemData.usedCount >= redeemData.maxUses) { 
        setPopup({ show: true, type: 'error', message: 'Code limit reached 🚫' });
        return; 
      }

      // Check if user already used THIS specific code
      const q = query(collection(db, 'userRedeems'), where('userId', '==', user.uid), where('code', '==', code));
      const existingRedeems = await getDocs(q);
      if (!existingRedeems.empty) { 
        setPopup({ show: true, type: 'error', message: 'You already used this code ⚠️' });
        return; 
      }

      const batch = writeBatch(db);
      
      // Record usage
      batch.set(doc(collection(db, 'userRedeems')), { 
        userId: user.uid, 
        code, 
        plan: redeemData.plan,
        createdAt: serverTimestamp() 
      });

      // Update user plan and credits
      batch.update(doc(db, 'users', user.uid), { 
        plan: redeemData.plan, 
        credits: increment(redeemData.credits || 0),
        updatedAt: serverTimestamp()
      });

      // Increment global usage
      batch.update(redeemRef, { usedCount: increment(1) });

      await batch.commit();

      // Update local state
      setUser(prev => prev ? { 
        ...prev, 
        plan: redeemData.plan, 
        credits: (prev.credits || 0) + (redeemData.credits || 0) 
      } : null);

      setPopup({ 
        show: true, 
        type: 'success', 
        message: `Redeemed successfully! 🎉\nYour ${redeemData.plan} plan is now active.`, 
        plan: redeemData.plan 
      });

    } catch (error) {
      console.error("Redeem Error:", error);
      const message = error instanceof Error && error.message.includes('permission') 
        ? 'Permission denied. Please contact support. ❌' 
        : 'Something went wrong ❌';
      setPopup({ show: true, type: 'error', message });
      throw error; // Re-throw so the caller knows it failed
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'threads'), { 
        userId: user.uid, 
        title: 'New Conversation', 
        isPinned: false,
        isArchived: false,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
      setCurrentChatId(docRef.id);
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'threads'); }
  };

  const handlePinChat = async (threadId: string, isPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'threads', threadId), { isPinned, updatedAt: serverTimestamp() });
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `threads/${threadId}`); }
  };

  const handleArchiveChat = async (threadId: string, isArchived: boolean) => {
    try {
      await updateDoc(doc(db, 'threads', threadId), { isArchived, updatedAt: serverTimestamp() });
      if (isArchived && currentChatId === threadId) {
        setCurrentChatId(null);
      }
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `threads/${threadId}`); }
  };

  const handleRenameChat = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'threads', threadId), { title: newTitle, updatedAt: serverTimestamp() });
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `threads/${threadId}`); }
  };

  const handleDeleteChat = async (threadId: string) => {
    try {
      // 1. Delete all messages
      const q = query(collection(db, 'chats'), where('threadId', '==', threadId), where('userId', '==', user?.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 2. Delete the thread
      await deleteDoc(doc(db, 'threads', threadId));
      
      if (currentChatId === threadId) {
        setCurrentChatId(null);
      }
    } catch (error) { handleFirestoreError(error, OperationType.DELETE, `threads/${threadId}`); }
  };

  const handleSendMessage = async (content: string, attachment?: Attachment) => {
    if (!user) return;
    
    if (user.role !== 'owner') {
      const currentPlanSettings = planSettings[user.plan];
      const limit = currentPlanSettings?.dailyLimit || PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE;
      
      if ((user.dailyUsage || 0) >= limit) {
        alert("Your quota is over 🚫 Upgrade your plan");
        setActivePage('pricing');
        return;
      }
    }

    let threadId = currentChatId;
    if (!threadId) {
      try {
        const docRef = await addDoc(collection(db, 'threads'), {
          userId: user.uid,
          title: content ? content.slice(0, 30) : 'New Conversation',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        threadId = docRef.id;
        setCurrentChatId(threadId);
      } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'threads'); return; }
    }

    const shouldSave = userSettings.saveHistory && !userSettings.privacyMode;

    try {
      const key = getEncryptionKey(user.uid);
      const encryptedContent = encrypt(content || "", key);
      
      const userMessageData: any = { 
        userId: user.uid, 
        threadId, 
        sender: 'user', 
        message: encryptedContent, 
        timestamp: serverTimestamp() 
      };
      
      if (attachment) userMessageData.attachment = attachment;
      
      if (shouldSave) {
        await addDoc(collection(db, 'chats'), userMessageData);
        await setDoc(doc(db, 'threads', threadId), { updatedAt: serverTimestamp() }, { merge: true });
      } else {
        // Session only mode: add to local state
        const tempMsg: Message = {
          id: crypto.randomUUID(),
          userId: user.uid,
          threadId,
          sender: 'user',
          message: content || "",
          timestamp: new Date(),
          attachment
        };
        setMessages(prev => [...prev, tempMsg]);
      }

      await updateDoc(doc(db, 'users', user.uid), { dailyUsage: increment(1) });
      
      setIsTyping(true);
      setStreamingMessage('');
      abortControllerRef.current = new AbortController();

      const history = messages.map(m => ({
        role: m.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: m.message }]
      }));
      
      const systemPrompt = undefined;

      let fullContent = '';
      try {
        const buildPrompt = (input: string) => `
You are Blaze AI.

- No ads
- Clean answer only
- Direct output

User:
${input}
`;
        const prompt = buildPrompt(content);
        
        const selectedModelConfig = aiModels.find((m: any) => m.id === selectedAIModel);
        let text = "";

        if (selectedModelConfig?.type === "github") {
          const response = await fetch('/api/github-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, model: selectedAIModel })
          });
          if (!response.ok) throw new Error('API Error');
          const data = await response.json();
          text = data.response || "";
        } else {
          const res = await fetch(
            `https://shaikhs-ai.rajageminiwala.workers.dev/chat/get?prompt=${encodeURIComponent(prompt)}&model=${selectedAIModel}`
          );

          if (!res.ok) {
            throw new Error('API Error');
          }

          const data = await res.json();
          text = data.response || "";
        }

        // Clean response
        text = text.replace(/\[THREAD_ID:.*?\]/g, "");
        text = text.replace(/<think>.*?<\/think>/gs, "");
        text = text.replace(/📢.*/g, "");

        fullContent = text.trim();
        
        // Simulate streaming for smoother UI
        const words = fullContent.split(' ');
        let currentText = '';
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 30; // ms between state updates

        for (let i = 0; i < words.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;
          
          currentText += words[i] + (i < words.length - 1 ? ' ' : '');
          
          const now = performance.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL || i === words.length - 1) {
            setStreamingMessage(currentText);
            lastUpdateTime = now;
            // Wait for one frame to let React render
            await new Promise(resolve => requestAnimationFrame(resolve));
          }
          
          // Small delay for natural typing feel
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      } catch (err: any) {
        fullContent = `Error: ${err.message}`;
        setStreamingMessage(fullContent);
      }

      if (abortControllerRef.current?.signal.aborted) return;
      
      if (shouldSave) {
        await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          threadId,
          sender: 'ai',
          message: encrypt(fullContent || "No response received", key),
          timestamp: serverTimestamp(),
          modelUsed: selectedAIModel
        });
      } else {
        // Session only mode: add to local state
        const tempAiMsg: Message = {
          id: crypto.randomUUID(),
          userId: user.uid,
          threadId,
          sender: 'ai',
          message: fullContent || "No response received",
          timestamp: new Date(),
          modelUsed: selectedAIModel
        };
        setMessages(prev => [...prev, tempAiMsg]);
      }
    } catch (error: any) { 
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
        const stoppedMsg = streamingMessage ? `${streamingMessage}\n\n[Generation stopped ⛔]` : "Generation stopped ⛔";
        
        if (shouldSave) {
          const key = getEncryptionKey(user.uid);
          await addDoc(collection(db, 'chats'), {
            userId: user.uid,
            threadId,
            sender: 'ai',
            message: encrypt(stoppedMsg, key),
            timestamp: serverTimestamp(),
            modelUsed: selectedAIModel,
            isStopped: true
          });
        } else {
          const tempAiMsg: Message = {
            id: crypto.randomUUID(),
            userId: user.uid,
            threadId,
            sender: 'ai',
            message: stoppedMsg,
            timestamp: new Date(),
            modelUsed: selectedAIModel
          };
          setMessages(prev => [...prev, tempAiMsg]);
        }
      } else {
        console.error(error); 
      }
    } finally { 
      setIsTyping(false); 
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as UserSettings;
        setUserSettings(settings);
        localStorage.setItem('settings', JSON.stringify(settings));
      } else {
        // Initialize settings if they don't exist
        setDoc(doc(db, 'users', user.uid, 'settings', 'config'), DEFAULT_SETTINGS)
          .catch(err => console.error("Error initializing user settings:", err));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/config`));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    // Apply Font Size
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[userSettings.fontSize] || '16px';
  }, [userSettings.fontSize]);

  useEffect(() => {
    if (popup?.show) {
      const timer = setTimeout(() => setPopup(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    try {
      const key = getEncryptionKey(user.uid);
      const encryptedUpdates = { ...updates };
      
      if (encryptedUpdates.apiKey) {
        encryptedUpdates.apiKey = encrypt(encryptedUpdates.apiKey, key);
      }

      const newSettings = { ...userSettings, ...updates };
      setUserSettings(newSettings);
      localStorage.setItem('settings', JSON.stringify(newSettings));
      await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), encryptedUpdates, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleUpdateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`); }
  };

  const handleSaveToMemory = async (content: string, category: 'preference' | 'fact' | 'instruction') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'memories'), { userId: user.uid, content, category, createdAt: serverTimestamp() });
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'memories'); }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'threads'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      const mq = query(collection(db, 'chats'), where('userId', '==', user.uid));
      const msnap = await getDocs(mq);
      msnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
      setPopup({ show: true, type: 'success', message: 'Chat history cleared successfully! 🧹' });
    } catch (error) { 
      handleFirestoreError(error, OperationType.DELETE, 'history'); 
      setPopup({ show: true, type: 'error', message: 'Failed to clear history ❌' });
    }
  };

  const handleExportData = async () => {
    try {
      const data = { user, chats, messages, memories };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blaze-ai-data-${user?.uid}.json`;
      a.click();
      setPopup({ show: true, type: 'success', message: 'Data exported successfully! 📥' });
    } catch (error) {
      setPopup({ show: true, type: 'error', message: 'Failed to export data ❌' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await handleClearHistory();
      await deleteDoc(doc(db, 'users', user.uid));
      await handleLogout();
      setPopup({ show: true, type: 'success', message: 'Account deleted successfully. 👋' });
    } catch (error) { 
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`); 
      setPopup({ show: true, type: 'error', message: 'Failed to delete account ❌' });
    }
  };

  // Seed database for first owner
  useEffect(() => {
    if (user?.role === 'owner') {
      const seed = async () => {
        const plansSnap = await getDocs(collection(db, 'planSettings'));
        if (plansSnap.empty) {
          const batch = writeBatch(db);
          const defaultPlans: Record<string, any> = {
            FREE: { name: 'FREE', price: 0, dailyLimit: 20, features: { chat: true, code: false, image: false, tools: false, priority: false }, maxTokens: 1000, speed: 'slow', isEnabled: true },
            PRO: { name: 'PRO', price: 2.99, dailyLimit: 100, features: { chat: true, code: true, image: true, tools: false, priority: false }, maxTokens: 4000, speed: 'medium', isEnabled: true },
            PLUS: { name: 'PLUS', price: 5.99, dailyLimit: 300, features: { chat: true, code: true, image: true, tools: true, priority: true }, maxTokens: 8000, speed: 'medium', isEnabled: true },
            ELITE: { name: 'ELITE', price: 10.99, dailyLimit: 1000, features: { chat: true, code: true, image: true, tools: true, priority: true }, maxTokens: 16000, speed: 'fast', isEnabled: true }
          };
          Object.entries(defaultPlans).forEach(([id, data]) => {
            batch.set(doc(db, 'planSettings', id), data);
          });
          await batch.commit();
        }

        const appSettingsSnap = await getDoc(doc(db, 'appSettings', 'global'));
        if (!appSettingsSnap.exists()) {
          await setDoc(doc(db, 'appSettings', 'global'), {
            maintenance: false,
            message: "We are under maintenance. Please come back later.",
            allowAdmins: true
          });
        }
      };
      seed();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-black fill-black" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
  }

  if (appSettings?.maintenance && user?.role !== 'admin' && user?.role !== 'owner') {
    return (
      <div className="h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Zap className="w-12 h-12 text-white fill-white" />
          </motion.div>
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">🚧 Maintenance Mode</h1>
        <p className="text-zinc-400 max-w-md text-lg leading-relaxed">
          {appSettings.message || "We are currently performing some system upgrades. We'll be back online shortly!"}
        </p>
        <div className="mt-12 flex items-center gap-3 text-zinc-500 text-sm font-bold uppercase tracking-widest">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          System Update in Progress
        </div>
      </div>
    );
  }

  if (!isVerified) return <VerificationScreen onVerified={() => setIsVerified(true)} onLogout={handleLogout} />;

  if (user?.status === 'blocked') {
    return (
      <div className="h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8 border border-red-500/20"
        >
          <Ban className="w-12 h-12 text-red-500" />
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Account Blocked 🚫</h1>
        <p className="text-zinc-400 max-w-md text-lg leading-relaxed">
          Your account has been temporarily disabled by the administrator. Please contact support if you believe this is a mistake.
        </p>
        <button 
          onClick={handleLogout}
          className="mt-12 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl border border-zinc-800 transition-all"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {user && <BroadcastBanner user={user} />}
      <div className="flex bg-zinc-950 text-white overflow-hidden w-full fixed top-0 left-0" style={{ height: '100dvh' }}>
        <div 
          ref={parallaxRef}
          className="parallax-bg"
          style={{ willChange: 'transform' }}
        >
          <div className="parallax-stars" />
        </div>
        <Sidebar 
          isOpen={sidebarOpen} setIsOpen={setSidebarOpen} chats={chats} currentChatId={currentChatId} activePage={activePage}
          planSettings={planSettings} userSettings={userSettings}
          onNavigate={handleNavigate}
          onNewChat={handleNewChat} onSelectChat={setCurrentChatId} onLogout={handleLogout} user={user}
          privacyMode={userSettings.privacyMode}
          onPinChat={handlePinChat}
          onRenameChat={handleRenameChat}
          onArchiveChat={handleArchiveChat}
          onDeleteChat={handleDeleteChat}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
          onComingSoon={showComingSoonPopup}
        />
        <main className="flex-1 flex flex-col min-w-0 relative">
            {/* Global Progress Bar */}
            <AnimatePresence>
              {isNavigating && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed top-0 left-0 h-1 bg-white z-[9999] shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                />
              )}
            </AnimatePresence>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Zap className="w-5 h-5 text-black fill-black" /></div>
                  <span className="font-bold text-lg tracking-tight">BLAZE-AI</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell user={user} settings={userSettings} />
                <button type="button" onClick={() => handleNavigate('profile')} className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                  {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-bold">{user.displayName?.charAt(0) || 'U'}</div>}
                </button>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex-1 flex flex-col min-h-0"
              >
                <Suspense fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                  </div>
                }>
                  {activePage === 'chat' && (
                  <ChatInterface 
                    messages={messages} onSendMessage={handleSendMessage} onStopGenerating={handleStopGenerating} currentMode={currentMode} selectedAIModel={selectedAIModel}
                    onAIModelChange={(model) => { setSelectedAIModel(model); handleUpdateUser({ selectedModel: model }); }}
                    setMode={(mode) => { setCurrentMode(mode); handleUpdateUser({ mode }); }}
                    onSaveToMemory={(content) => handleSaveToMemory(content, 'fact')} isTyping={isTyping} streamingMessage={streamingMessage} userPlan={user.role === 'owner' ? 'OWNER' : user.plan}
                    isLoading={isInitialLoading} userRole={user.role} privacyMode={userSettings.privacyMode} currentUser={user}
                    aiModels={aiModels}
                  />
                )}
                {activePage === 'settings' && (
                  <div className="flex-1 p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full overflow-y-auto scrollbar-hide">
                    <SettingsPanel 
                      user={user} 
                      settings={userSettings}
                      onClose={() => handleNavigate('chat')} 
                      onUpdateUser={handleUpdateUser} 
                      onUpdateSettings={handleUpdateSettings}
                      onLogout={handleLogout} 
                      onClearHistory={handleClearHistory} 
                      onExportData={handleExportData} 
                      onDeleteAccount={handleDeleteAccount} 
                      onRedeemCode={handleRedeemCode} 
                      onNavigate={handleNavigate} 
                      onShowHelp={() => setShowHelp(true)}
                      inline={true} 
                    />
                  </div>
                )}
                {activePage === 'profile' && (
                  <div className="flex-1 p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full overflow-y-auto scrollbar-hide">
                    <ProfilePanel user={user} onUpdateUser={handleUpdateUser} onNavigate={handleNavigate} />
                  </div>
                )}
                {activePage === 'support' && (
                  <div className="flex-1 p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full overflow-y-auto scrollbar-hide">
                    <SupportPanel user={user} onNavigate={handleNavigate} />
                  </div>
                )}
                {activePage === 'admin' && user?.role === 'owner' && (
                  <AdminPanel currentUser={user} onClose={() => handleNavigate('chat')} aiModels={aiModels} onToggleModel={toggleModel} />
                )}
                {activePage === 'pricing' && (
                  <PricingPanel 
                    user={user} 
                    planSettings={planSettings}
                    onClose={() => handleNavigate('chat')} 
                    onUpgrade={async (plan) => {
                      const currentPlan = user?.plan || 'FREE';
                      const isUpgrade = PLAN_ORDER[plan] > PLAN_ORDER[currentPlan];
                      
                      try {
                        await handleUpdateUser({ plan });
                        setPopup({ 
                          show: true, 
                          type: 'success', 
                          message: isUpgrade 
                            ? `Successfully upgraded to ${plan}! ✨` 
                            : `Successfully downgraded to ${plan}.`, 
                          plan 
                        });
                        handleNavigate('chat');
                      } catch (error) {
                        setPopup({ show: true, type: 'error', message: 'Something went wrong ❌' });
                      }
                    }} 
                  />
                )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

      <AnimatePresence>
        {showHelp && (
          <Suspense fallback={null}>
            <HelpCenter 
              onClose={() => setShowHelp(false)}
              onNavigate={handleNavigate}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Global Popup */}
      <AnimatePresence>
        {popup?.show && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-sm rounded-[2.5rem] p-8 border shadow-2xl ${
                popup.type === 'success' 
                  ? 'bg-zinc-900 border-green-500/20 shadow-green-500/10' 
                  : 'bg-zinc-900 border-red-500/20 shadow-red-500/10'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  popup.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {popup.type === 'success' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                      <Zap className="w-8 h-8 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>
                      <AlertTriangle className="w-8 h-8" />
                    </motion.div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">
                    {popup.type === 'success' ? 'Success!' : 'Error'}
                  </h3>
                  <p className="text-zinc-400 font-medium">{popup.message}</p>
                </div>

                {popup.plan && (
                  <div className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">New Plan Activated</p>
                    <p className="text-xl font-black text-white">{popup.plan}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setPopup(null)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 text-white px-5 py-3 rounded-xl shadow-2xl z-[10000] flex items-center gap-3 backdrop-blur-md"
          >
            <div className="bg-amber-500/20 text-amber-500 p-1.5 rounded-lg">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Feature Coming Soon</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Premium feature locked</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
