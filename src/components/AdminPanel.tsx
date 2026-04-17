import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  Settings, 
  Ticket, 
  BarChart3, 
  Shield, 
  Box, 
  Code2, 
  Search, 
  Image as ImageIcon,
  MessageSquare,
  Power,
  Plus,
  Trash2,
  Ban,
  User,
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  X,
  RotateCcw,
  Play,
  Bell,
  LogOut,
  LifeBuoy,
  ExternalLink,
  FileText,
  Video
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  where,
  getDocs,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, storage } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { UserProfile, SystemSettings, RedeemCode, AdminLog, PlanSettings, Plan, AppSettings, OperationType, SupportTicket, Broadcast } from '../types';
import { PLAN_PRICING, PLAN_FEATURES, PLAN_LIMITS } from '../lib/subscription';
import { sendNotification } from '../lib/notifications';

interface AdminPanelProps {
  currentUser: UserProfile;
  onClose: () => void;
  aiModels: any[];
  onToggleModel: (id: string) => void;
}

const FullScreenPanel = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] bg-zinc-950/95 backdrop-blur-2xl flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
            title="Back"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-500 group-hover:text-white" />
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800/50">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </motion.div>
  );
};

export function AdminPanel({ currentUser, onClose, aiModels, onToggleModel }: AdminPanelProps) {
  const isOwner = currentUser.role === 'owner';
  const isAdmin = currentUser.role === 'admin';

  if (!isOwner && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-black text-white">Access Denied</h2>
          <p className="text-zinc-400">Only administrators can access the control panel.</p>
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white text-black rounded-lg font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai' | 'redeem' | 'logs' | 'analytics' | 'codeManager' | 'planSettings' | 'maintenance' | 'support' | 'broadcasts'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState({
    plan: 'all',
    status: 'all',
    role: 'all'
  });
  const [confirmAction, setConfirmAction] = useState<{
    type: 'block' | 'unblock' | 'delete' | 'reset' | 'role' | 'plan' | 'reset_plans' | 'delete_broadcast' | 'delete_code' | 'toggle_maintenance';
    id: string;
    title: string;
    data?: any;
  } | null>(null);
  const [supportConfirm, setSupportConfirm] = useState<{
    type: 'deny' | 'delete';
    ticketId: string;
    subject: string;
  } | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [planSettings, setPlanSettings] = useState<PlanSettings[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [newBroadcast, setNewBroadcast] = useState<Partial<Broadcast>>({
    type: 'info',
    target: 'all',
    userIds: []
  });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [loading, setLoading] = useState(true);

  // Support Tickets State
  const [ticketFilter, setTicketFilter] = useState({ status: 'all', issueType: 'all' });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleUpdateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    setIsProcessingAction(true);
    try {
      console.log("Updating ticket status/reply...", ticketId, updates);
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log("Ticket update successful");
      
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && updates.status) {
        let message = "";
        switch (updates.status) {
          case 'resolved': message = "Your issue has been resolved ✅"; break;
          case 'pending': message = "Your ticket is under review ⏳"; break;
          case 'denied': message = "Your request was denied ❌"; break;
        }
        if (message) {
          await sendNotification(ticket.userId, message, 'support');
        }
      }

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updates } as SupportTicket);
      }
      setSupportConfirm(null);
      setDenyReason('');
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Action failed ❌");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReplyTicket = async () => {
    if (!selectedTicket || !adminReply.trim()) return;
    setIsReplying(true);
    try {
      await handleUpdateTicket(selectedTicket.id, {
        adminReply,
        status: 'pending' // Auto-change to pending when replied
      });
      setAdminReply('');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    setIsProcessingAction(true);
    try {
      console.log("Delete clicked for ticket:", ticketId);
      
      // Find ticket to get mediaUrls
      const ticketToDelete = tickets.find(t => t.id === ticketId);
      
      // Delete media files if they exist
      if (ticketToDelete?.mediaUrl && ticketToDelete.mediaUrl.length > 0) {
        console.log("Deleting associated media files...");
        for (const url of ticketToDelete.mediaUrl) {
          try {
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);
          } catch (err) {
            console.error("Failed to delete media file:", url, err);
          }
        }
      }

      await deleteDoc(doc(db, 'supportTickets', ticketId));
      setSelectedTicket(null);
      setSupportConfirm(null);
      console.log("Ticket deleted successfully");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      alert("Action failed ❌");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDenyTicket = async (ticketId: string) => {
    console.log("Deny clicked for ticket:", ticketId);
    if (!denyReason.trim()) {
      alert("Please provide a reason for denial.");
      return;
    }
    
    await handleUpdateTicket(ticketId, {
      status: 'denied',
      adminReply: denyReason
    });
  };

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter.status !== 'all' && t.status !== ticketFilter.status) return false;
    if (ticketFilter.issueType !== 'all' && t.issueType !== ticketFilter.issueType) return false;
    return true;
  });

  // Redeem Code Generation State
  const [newCodePlan, setNewCodePlan] = useState<'PLUS' | 'PRO' | 'ELITE'>('PRO');
  const [newCodeDuration, setNewCodeDuration] = useState<string>('1_month');
  const [customDays, setCustomDays] = useState<string>('30');
  const [restrictedEmail, setRestrictedEmail] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // AI Settings Local State
  const [tempSettings, setTempSettings] = useState<Partial<SystemSettings>>({
    temperature: 0.7,
    defaultModel: 'gpt4o',
    globalSystemPrompt: ''
  });

  useEffect(() => {
    if (settings) {
      setTempSettings({
        temperature: settings.temperature,
        defaultModel: settings.defaultModel,
        globalSystemPrompt: settings.globalSystemPrompt
      });
    }
  }, [settings]);

  useEffect(() => {
    // Global settings and app settings are needed for multiple tabs
    const unsubSettings = onSnapshot(doc(db, 'systemSettings', 'global'), (s) => {
      if (s.exists()) setSettings(s.data() as SystemSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'systemSettings/global'));

    const unsubAppSettings = onSnapshot(doc(db, 'appSettings', 'global'), (d) => {
      if (d.exists()) setAppSettings(d.data() as AppSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'appSettings/global'));

    setLoading(false);

    return () => {
      unsubSettings();
      unsubAppSettings();
    };
  }, [currentUser.uid, currentUser.role]);

  const handleSendBroadcast = async () => {
    if (!newBroadcast.title || !newBroadcast.message) {
      alert("Title and message are required.");
      return;
    }
    setIsSendingBroadcast(true);
    try {
      await addDoc(collection(db, 'broadcasts'), {
        ...newBroadcast,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      setNewBroadcast({ type: 'info', target: 'all', userIds: [] });
      alert("Broadcast sent successfully!");
    } catch (error) {
      console.error("Error sending broadcast:", error);
      alert("Failed to send broadcast.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Tab-specific listeners
  useEffect(() => {
    const isOwner = currentUser.role === 'owner';
    const isAdmin = currentUser.role === 'admin';
    if (!isOwner && !isAdmin) return;

    let unsub: (() => void) | undefined;

    if (activeTab === 'users') {
      unsub = onSnapshot(collection(db, 'users'), (s) => {
        setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    } else if (activeTab === 'redeem') {
      unsub = onSnapshot(collection(db, 'redeem'), (s) => {
        setRedeemCodes(s.docs.map(d => ({ id: d.id, ...d.data() } as RedeemCode)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'redeem'));
    } else if (activeTab === 'logs') {
      unsub = onSnapshot(query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc')), (s) => {
        setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as AdminLog)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'adminLogs'));
    } else if (activeTab === 'planSettings') {
      unsub = onSnapshot(collection(db, 'planSettings'), (s) => {
        setPlanSettings(s.docs.map(d => ({ id: d.id as Plan, ...d.data() } as PlanSettings)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'planSettings'));
    } else if (activeTab === 'support') {
      console.log("Fetching support tickets for admin...");
      unsub = onSnapshot(query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc')), (s) => {
        console.log("Admin fetched support tickets successfully, count:", s.docs.length);
        setTickets(s.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
      }, (error) => {
        console.error("Error fetching support tickets for admin:", error);
        handleFirestoreError(error, OperationType.LIST, 'supportTickets');
      });
    } else if (activeTab === 'broadcasts') {
      unsub = onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc')), (s) => {
        setBroadcasts(s.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'broadcasts'));
    }

    return () => {
      if (unsub) unsub();
    };
  }, [currentUser.uid, currentUser.role, activeTab]);

  const logAction = async (action: string, details: string) => {
    await addDoc(collection(db, 'adminLogs'), {
      adminId: currentUser.uid,
      action,
      details,
      timestamp: serverTimestamp()
    });
  };

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    setIsProcessingAction(true);
    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      await logAction('Update User', `Updated user ${uid}: ${JSON.stringify(updates)}`);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Update failed ❌");
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    setIsProcessingAction(true);
    try {
      await deleteDoc(doc(db, 'users', uid));
      await logAction('Delete User', `Deleted user ${uid}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Deletion failed ❌");
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  const handleSaveGlobalSettings = async () => {
    await setDoc(doc(db, 'systemSettings', 'global'), tempSettings, { merge: true });
    logAction('Update Global Settings', `Updated AI behavior: ${JSON.stringify(tempSettings)}`);
  };

  const handleCreateRedeemCode = async (codeData: Partial<RedeemCode>) => {
    if (!codeData.code) return;
    
    const newCode: any = {
      code: codeData.code,
      plan: codeData.plan || 'PRO',
      credits: codeData.credits || 0,
      maxUses: codeData.maxUses || 100,
      usedCount: 0,
      expiryDate: codeData.expiryDate || null,
      createdAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'redeem', codeData.code), newCode);
    logAction('Create Redeem Code', `Created code ${codeData.code}`);
  };

  const handleUpdatePlan = async (planId: Plan, updates: Partial<PlanSettings>) => {
    await setDoc(doc(db, 'planSettings', planId), updates, { merge: true });
    logAction('Update Plan Setting', `Updated plan ${planId}: ${JSON.stringify(updates)}`);
  };

  const handleResetPlans = async () => {
    setIsProcessingAction(true);
    try {
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
      await logAction('Reset Plans', 'All plans reset to default values');
      alert("Plans reset successfully! ✅");
    } catch (error) {
      console.error("Error resetting plans:", error);
      alert("Reset failed ❌");
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  const handleUpdateAppSettings = async (updates: Partial<AppSettings>) => {
    await setDoc(doc(db, 'appSettings', 'global'), updates, { merge: true });
    logAction('Update App Settings', `Updated app settings: ${JSON.stringify(updates)}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Admin Control</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">System Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">System Online</span>
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">v2.4.0</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all relative">
              <Bell className="w-5 h-5" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-zinc-900" />
            </button>
            
            <div className="w-px h-8 bg-zinc-800 mx-1" />
            
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{currentUser.displayName || 'Admin'}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-full h-full p-2 text-zinc-500" />
                )}
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-2"
                title="Back to App"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-xs font-bold hidden lg:block">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-800 p-4 space-y-2 overflow-y-auto">
          <AdminNavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
          />
          <AdminNavItem 
            icon={<Users className="w-4 h-4" />} 
            label="Users" 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
          />
          <AdminNavItem 
            icon={<LifeBuoy className="w-4 h-4" />} 
            label="Support Tickets" 
            active={activeTab === 'support'} 
            onClick={() => setActiveTab('support')} 
          />
          <AdminNavItem 
            icon={<Bell className="w-4 h-4" />} 
            label="Broadcasts" 
            active={activeTab === 'broadcasts'} 
            onClick={() => setActiveTab('broadcasts')} 
          />
          <AdminNavItem 
            icon={<Shield className="w-4 h-4" />} 
            label="Plan Settings" 
            active={activeTab === 'planSettings'} 
            onClick={() => setActiveTab('planSettings')} 
          />
          <AdminNavItem 
            icon={<AlertCircle className="w-4 h-4" />} 
            label="Maintenance" 
            active={activeTab === 'maintenance'} 
            onClick={() => setActiveTab('maintenance')} 
          />
          <AdminNavItem 
            icon={<Zap className="w-4 h-4" />} 
            label="AI Control" 
            active={activeTab === 'ai'} 
            onClick={() => setActiveTab('ai')} 
          />
          <AdminNavItem 
            icon={<Ticket className="w-4 h-4" />} 
            label="Redeem Codes" 
            active={activeTab === 'redeem'} 
            onClick={() => setActiveTab('redeem')} 
          />
          <AdminNavItem 
            icon={<Clock className="w-4 h-4" />} 
            label="Activity Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <AdminNavItem 
            icon={<BarChart3 className="w-4 h-4" />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
          />
          <AdminNavItem 
            icon={<Code2 className="w-4 h-4" />} 
            label="Code Generator" 
            active={activeTab === 'codeManager'} 
            onClick={() => setActiveTab('codeManager')} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Users" value={users.length} icon={<Users className="w-5 h-5" />} color="blue" />
              <StatCard title="Total Models" value={aiModels.length} icon={<Box className="w-5 h-5" />} color="emerald" />
              <StatCard title="Redeem Codes" value={redeemCodes.length} icon={<Ticket className="w-5 h-5" />} color="amber" />
              <StatCard title="Daily Requests" value="1,284" icon={<Zap className="w-5 h-5" />} color="white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-zinc-500" /> System Traffic
                    </h3>
                    <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-400 focus:outline-none">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-end gap-2 px-2">
                    {[40, 70, 45, 90, 65, 85, 40, 100, 75, 55, 80, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-500/20 rounded-t-lg relative group">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                          className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg group-hover:bg-blue-400 transition-colors"
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {h * 12} req
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-2">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:59</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-zinc-500" /> Recent Activity
                    </h3>
                    <div className="space-y-4">
                      {logs.slice(0, 4).map(log => (
                        <div key={log.id} className="flex items-start gap-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{log.action}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{log.timestamp?.toDate().toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Box className="w-5 h-5 text-zinc-500" /> Model Status
                    </h3>
                    <div className="space-y-3">
                      {aiModels.slice(0, 4).map(mod => (
                        <div key={mod.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${mod.enabled !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm font-bold">{mod.name}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${mod.enabled !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {mod.enabled !== false ? 'Active' : 'Off'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-6">
                  <h3 className="text-lg font-bold">Plan Distribution</h3>
                  <div className="space-y-4">
                    {['FREE', 'PRO', 'PLUS', 'ELITE'].map(p => {
                      const count = users.filter(u => u.plan === p).length;
                      const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                      return (
                        <div key={p} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-zinc-400">{p}</span>
                            <span className="text-white">{count} users</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={`h-full rounded-full ${p === 'ELITE' ? 'bg-purple-500' : p === 'PLUS' ? 'bg-amber-500' : p === 'PRO' ? 'bg-blue-500' : 'bg-zinc-600'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight">System Performance</h4>
                    <p className="text-sm text-blue-100 mt-1">All systems are operational. Average response time: 450ms.</p>
                  </div>
                  <button type="button" className="w-full py-3 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
                    View Detailed Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Panels */}
      <AnimatePresence>
        {activeTab === 'users' && (
          <FullScreenPanel title="User Management" onClose={() => setActiveTab('overview')}>
            <div className="space-y-6">
                {/* Search & Filters */}
                <div className="flex flex-col lg:flex-row gap-4 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <select 
                      value={userFilter.plan}
                      onChange={(e) => setUserFilter(prev => ({ ...prev, plan: e.target.value }))}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-400 focus:outline-none"
                    >
                      <option value="all">All Plans</option>
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="PLUS">PLUS</option>
                      <option value="ELITE">ELITE</option>
                    </select>
                    <select 
                      value={userFilter.status}
                      onChange={(e) => setUserFilter(prev => ({ ...prev, status: e.target.value }))}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-400 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <select 
                      value={userFilter.role}
                      onChange={(e) => setUserFilter(prev => ({ ...prev, role: e.target.value }))}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-400 focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">User</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Plan</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Activity</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {users.filter(u => {
                          const matchesSearch = (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
                                                u.displayName?.toLowerCase().includes(userSearch.toLowerCase()));
                          const matchesPlan = userFilter.plan === 'all' || u.plan === userFilter.plan;
                          const matchesStatus = userFilter.status === 'all' || u.status === userFilter.status;
                          const matchesRole = userFilter.role === 'all' || u.role === userFilter.role;
                          return matchesSearch && matchesPlan && matchesStatus && matchesRole;
                        }).map(u => (
                          <tr key={u.uid} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700">
                                  {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-full h-full p-2.5 text-zinc-600" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{u.displayName || 'User'}</p>
                                  <p className="text-[10px] text-zinc-500 font-mono truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                value={u.plan || 'FREE'}
                                onChange={(e) => setConfirmAction({ type: 'plan', id: u.uid, title: u.displayName || u.email, data: e.target.value })}
                                disabled={u.role === 'owner'}
                                className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md focus:outline-none bg-zinc-950 border border-zinc-800 ${u.role === 'owner' ? 'text-amber-500' : (u.plan === 'ELITE' ? 'text-purple-500' : u.plan === 'PLUS' ? 'text-amber-500' : u.plan === 'PRO' ? 'text-blue-500' : 'text-zinc-400')}`}
                              >
                                <option value="FREE">FREE</option>
                                <option value="PRO">PRO</option>
                                <option value="PLUS">PLUS</option>
                                <option value="ELITE">ELITE</option>
                                {u.role === 'owner' && <option value="OWNER">OWNER</option>}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {u.role === 'owner' ? (
                                  <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md tracking-widest">
                                    👑 OWNER
                                  </span>
                                ) : (
                                  <select 
                                    value={u.role || 'user'}
                                    onChange={(e) => setConfirmAction({ type: 'role', id: u.uid, title: u.displayName || u.email, data: e.target.value })}
                                    className="bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md focus:outline-none text-zinc-400"
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{u.lastLogin ? (u.lastLogin.toDate ? u.lastLogin.toDate().toLocaleDateString() : new Date(u.lastLogin).toLocaleDateString()) : 'Never'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                                  <Zap className="w-3 h-3" />
                                  <span>{u.totalUsage || 0} total req</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${u.status === 'blocked' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {u.status === 'blocked' ? 'Blocked 🚫' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  type="button"
                                  onClick={() => setConfirmAction({ type: u.status === 'blocked' ? 'unblock' : 'block', id: u.uid, title: u.displayName || u.email })}
                                  disabled={u.role === 'owner'}
                                  className={`p-2 rounded-xl transition-all ${u.status === 'blocked' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'} ${u.role === 'owner' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                  title={u.status === 'blocked' ? "Unblock User" : "Block User"}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setConfirmAction({ type: 'reset', id: u.uid, title: u.displayName || u.email })}
                                  disabled={u.role === 'owner'}
                                  className={`p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all ${u.role === 'owner' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                  title="Reset Usage"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setConfirmAction({ type: 'delete', id: u.uid, title: u.displayName || u.email })}
                                  disabled={u.role === 'owner'}
                                  className={`p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all ${u.role === 'owner' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
              {confirmAction && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                      confirmAction.type === 'delete' || confirmAction.type === 'block' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {confirmAction.type === 'delete' ? <Trash2 className="w-8 h-8" /> : 
                       confirmAction.type === 'block' ? <Ban className="w-8 h-8" /> :
                       confirmAction.type === 'reset' ? <RotateCcw className="w-8 h-8" /> :
                       <AlertCircle className="w-8 h-8" />}
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {confirmAction.type === 'block' ? 'Block User?' :
                         confirmAction.type === 'unblock' ? 'Unblock User?' :
                         confirmAction.type === 'delete' ? 'Delete User?' :
                         confirmAction.type === 'reset' ? 'Reset Usage?' :
                         confirmAction.type === 'role' ? 'Change Role?' : 
                          confirmAction.type === 'plan' ? 'Change Plan?' :
                          confirmAction.type === 'reset_plans' ? 'Reset All Plans?' :
                          confirmAction.type === 'delete_broadcast' ? 'Delete Broadcast?' :
                          confirmAction.type === 'delete_code' ? 'Delete Redeem Code?' : 
                          confirmAction.type === 'toggle_maintenance' ? 'Maintenance Mode?' : 'Confirm Action?'}
                      </h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {confirmAction.type === 'reset_plans' ? 'Are you sure you want to reset all subscription plans to their default values?' : 
                         `Are you sure you want to ${confirmAction.type.replace('_', ' ')} `}
                        {confirmAction.type !== 'reset_plans' && <span className="text-white font-bold">{confirmAction.title}</span>}
                        {confirmAction.type === 'delete' && "? This action is irreversible and will remove all user data."}
                        {confirmAction.type === 'block' && "? The user will be immediately restricted from accessing the application."}
                        {confirmAction.type === 'delete_broadcast' && "? This announcement will be removed from all users' feeds."}
                        {confirmAction.type === 'delete_code' && "? This code will no longer be redeemable by users."}
                        {confirmAction.type === 'toggle_maintenance' && `? This will ${confirmAction.data ? 'enable' : 'disable'} maintenance mode for all users.`}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setConfirmAction(null)}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          if (confirmAction.type === 'delete') await handleDeleteUser(confirmAction.id);
                          else if (confirmAction.type === 'block') await handleUpdateUser(confirmAction.id, { status: 'blocked' });
                          else if (confirmAction.type === 'unblock') await handleUpdateUser(confirmAction.id, { status: 'active' });
                          else if (confirmAction.type === 'reset') await handleUpdateUser(confirmAction.id, { dailyUsage: 0, totalUsage: 0 });
                          else if (confirmAction.type === 'role') await handleUpdateUser(confirmAction.id, { role: confirmAction.data });
                          else if (confirmAction.type === 'plan') await handleUpdateUser(confirmAction.id, { plan: confirmAction.data });
                          else if (confirmAction.type === 'reset_plans') await handleResetPlans();
                          else if (confirmAction.type === 'delete_broadcast') {
                            setIsProcessingAction(true);
                            try {
                              await deleteDoc(doc(db, 'broadcasts', confirmAction.id));
                              setConfirmAction(null);
                            } catch (error) { alert("Action failed ❌"); } finally { setIsProcessingAction(false); }
                          }
                          else if (confirmAction.type === 'delete_code') {
                            setIsProcessingAction(true);
                            try {
                              await deleteDoc(doc(db, 'redeem', confirmAction.id));
                              setConfirmAction(null);
                            } catch (error) { alert("Action failed ❌"); } finally { setIsProcessingAction(false); }
                          }
                          else if (confirmAction.type === 'toggle_maintenance') {
                            setIsProcessingAction(true);
                            try {
                              await handleUpdateAppSettings({ maintenance: confirmAction.data });
                              setConfirmAction(null);
                            } catch (error) { alert("Action failed ❌"); } finally { setIsProcessingAction(false); }
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                          ['delete', 'block', 'delete_broadcast', 'delete_code', 'reset_plans'].includes(confirmAction.type) ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                      >
{isProcessingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isProcessingAction ? 'Processing...' : 'Confirm'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}


            </AnimatePresence>
          </FullScreenPanel>
        )}

        {activeTab === 'ai' && (
          <FullScreenPanel title="AI Control Panel" onClose={() => setActiveTab('overview')}>
            <div className="space-y-8 max-w-3xl">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">AI Behavior Control</h2>
                  <p className="text-zinc-500">Configure global AI parameters and system instructions.</p>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Temperature</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={tempSettings.temperature}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Precise (0)</span>
                        <span className="text-white font-bold">{tempSettings.temperature}</span>
                        <span>Creative (1)</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Default Model</label>
                      <select 
                        value={tempSettings.defaultModel}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, defaultModel: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm"
                      >
                        <option value="gpt4o">GPT-4o</option>
                        <option value="claude">Claude 3.5</option>
                        <option value="deepseek">DeepSeek-R1</option>
                        <option value="llama">Llama 3.2</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global System Prompt</label>
                    <textarea 
                      className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-zinc-600"
                      placeholder="Enter global AI instructions..."
                      value={tempSettings.globalSystemPrompt}
                      onChange={(e) => setTempSettings(prev => ({ ...prev, globalSystemPrompt: e.target.value }))}
                    />
                  </div>

                  <div className="pt-6 border-t border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Model Access Control</h3>
                    <p className="text-xs text-zinc-500">Toggle which models are available to users.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {aiModels?.map(model => (
                        <div key={model.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{model.icon}</span>
                            <div>
                              <p className="font-bold text-sm text-white">{model.name}</p>
                              <p className="text-[10px] text-zinc-500">{model.id}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={model.enabled !== false} // Ensure enabled by default
                              onChange={() => onToggleModel(model.id)}
                            />
                            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800">
                    <button 
                      type="button"
                      onClick={handleSaveGlobalSettings}
                      className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-all"
                    >
                      Save Global Settings
                    </button>
                  </div>
                </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'redeem' && (
          <FullScreenPanel title="Redeem Code Manager" onClose={() => setActiveTab('overview')}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Select Plan</label>
                      <select 
                        value={newCodePlan}
                        onChange={(e) => setNewCodePlan(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold"
                      >
                        <option value="PLUS">PLUS Plan</option>
                        <option value="PRO">PRO Plan</option>
                        <option value="ELITE">ELITE Plan</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Select Duration</label>
                      <select 
                        value={newCodeDuration}
                        onChange={(e) => setNewCodeDuration(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold"
                      >
                        <option value="1_month">1 Month</option>
                        <option value="3_months">3 Months</option>
                        <option value="1_year">1 Year</option>
                        <option value="lifetime">Lifetime</option>
                        <option value="custom">Custom (Days)</option>
                      </select>
                    </div>
                    {newCodeDuration === 'custom' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custom Days</label>
                        <input 
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold"
                          placeholder="Enter days"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Restrict to Email (Optional)</label>
                      <input 
                        type="email"
                        value={restrictedEmail}
                        onChange={(e) => setRestrictedEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      handleCreateRedeemCode({ 
                        code: `BLAZE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        plan: newCodePlan, 
                        credits: newCodePlan === 'ELITE' ? 1000 : (newCodePlan === 'PRO' ? 500 : 200),
                        maxUses: 100,
                        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      });
                      setRestrictedEmail('');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> Generate Code
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {redeemCodes.map(code => (
                    <div key={code.id} className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-zinc-800 rounded-lg text-lg font-mono font-black text-white tracking-wider">
                            {code.code}
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(code.code);
                              setCopiedCode(code.code);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all"
                            title="Copy Code"
                          >
                            {copiedCode === code.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setConfirmAction({ type: 'delete_code', id: code.id, title: code.code })}
                          className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Plan: {code.plan}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-white">Credits: {code.credits}</p>
                          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">
                            Max Uses: {code.maxUses}
                          </span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[10px] font-bold text-zinc-500">
                        <span>Used: {code.usedCount} / {code.maxUses}</span>
                        <span className={code.usedCount >= code.maxUses ? 'text-red-500' : 'text-green-500'}>
                          {code.usedCount >= code.maxUses ? 'Limit Reached' : 'Valid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'logs' && (
          <FullScreenPanel title="System Activity Logs" onClose={() => setActiveTab('overview')}>
            <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="divide-y divide-zinc-800/50">
                    {logs.map(log => (
                      <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-zinc-900/20 transition-colors">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-white">{log.action}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {log.timestamp?.toDate().toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 break-all">{log.details}</p>
                          <p className="text-[10px] text-zinc-600 mt-2">Admin ID: {log.adminId}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'analytics' && (
          <FullScreenPanel title="System Analytics" onClose={() => setActiveTab('overview')}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title="Total Users" value={users.length} icon={<Users className="w-5 h-5" />} color="blue" />
                  <StatCard title="Active Models" value={aiModels.filter(m => m.enabled !== false).length} icon={<Box className="w-5 h-5" />} color="emerald" />
                  <StatCard title="Total Requests" value="12,450" icon={<Zap className="w-5 h-5" />} color="amber" />
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-500">
                  Analytics visualization coming soon.
                </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'codeManager' && (
          <FullScreenPanel title="Code Generator" onClose={() => setActiveTab('overview')}>
            <div className="flex flex-col h-full space-y-6">
              <div className="flex gap-4">
                <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700">
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="html">HTML/CSS</option>
                  <option value="react">React</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Describe the code you want to generate..." 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700"
                />
                <button type="button" className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2">
                  <Play className="w-4 h-4" /> Generate
                </button>
              </div>
              
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                  <span className="text-xs font-mono text-zinc-500">output.js</span>
                  <button type="button" className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <pre className="text-sm font-mono text-zinc-300">
                    <code>{`// Your generated code will appear here...
// Example:

function calculateFibonacci(n) {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

console.log(calculateFibonacci(10));`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'maintenance' && (
          <FullScreenPanel title="System Maintenance" onClose={() => setActiveTab('overview')}>
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${appSettings?.maintenance ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                      <Power className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white">Maintenance Mode</h4>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Global App Access</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setConfirmAction({ 
                      type: 'toggle_maintenance', 
                      id: 'global_settings', 
                      title: 'Global Settings', 
                      data: !appSettings?.maintenance 
                    })}
                    className={`w-14 h-7 rounded-full transition-colors relative ${appSettings?.maintenance ? 'bg-amber-500' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${appSettings?.maintenance ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Maintenance Message</label>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${appSettings?.maintenance ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      {appSettings?.maintenance ? 'Visible to Users' : 'Draft Mode'}
                    </span>
                  </div>
                  <textarea 
                    value={appSettings?.message || ''}
                    onChange={(e) => handleUpdateAppSettings({ message: e.target.value })}
                    placeholder="Enter maintenance message..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:outline-none focus:border-zinc-700 min-h-[120px] resize-none"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    This message will be displayed to all non-admin users when maintenance mode is active.
                  </p>
                </div>

                <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-bold text-white">Admin Bypass</p>
                      <p className="text-xs text-zinc-500">Admins can still access all features.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-bold text-zinc-400">Active</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-bold">Schedule Maintenance</span>
                  </div>
                  <p className="text-xs text-zinc-500">Coming soon: Set a start and end time for automatic maintenance windows.</p>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-bold">Whitelist Users</span>
                  </div>
                  <p className="text-xs text-zinc-500">Coming soon: Allow specific beta testers to access the app during maintenance.</p>
                </div>
              </div>
            </div>
          </FullScreenPanel>
        )}
        {activeTab === 'support' && (
          <FullScreenPanel title="Support Tickets" onClose={() => setActiveTab('overview')}>
            <div className="max-w-6xl mx-auto space-y-8">
              {selectedTicket ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Tickets
                  </button>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{selectedTicket.subject}</h2>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-500">Ticket ID: <span className="font-mono text-zinc-400">{selectedTicket.id}</span></span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-500">{selectedTicket.email}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-500">{selectedTicket.issueType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value as any })}
                          className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border focus:outline-none ${
                            selectedTicket.status === 'open' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                            selectedTicket.status === 'pending' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                            selectedTicket.status === 'resolved' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                            'text-red-400 bg-red-400/10 border-red-400/20'
                          }`}
                        >
                          <option value="open" className="bg-zinc-900 text-yellow-400">Open</option>
                          <option value="pending" className="bg-zinc-900 text-blue-400">Pending</option>
                          <option value="resolved" className="bg-zinc-900 text-green-400">Resolved</option>
                          <option value="denied" className="bg-zinc-900 text-red-400">Denied</option>
                        </select>
                        <button 
                          onClick={() => setSupportConfirm({ type: 'deny', ticketId: selectedTicket.id, subject: selectedTicket.subject })}
                          className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                          title="Deny Ticket"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setSupportConfirm({ type: 'delete', ticketId: selectedTicket.id, subject: selectedTicket.subject })}
                          className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                          <User className="w-4 h-4" />
                          User Description
                        </div>
                        <p className="text-zinc-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>

                      {/* Attachments View */}
                      {selectedTicket.mediaUrl && selectedTicket.mediaUrl.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">User Attachments</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedTicket.mediaUrl.map((url, i) => {
                              const type = selectedTicket.mediaType?.[i] || 'image';
                              return (
                                <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group">
                                  {type === 'image' ? (
                                    <div className="relative aspect-video">
                                      <img src={url} alt="Attachment" className="w-full h-full object-cover shadow-inner" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                                          <ExternalLink className="w-5 h-5" />
                                        </a>
                                      </div>
                                    </div>
                                  ) : type === 'video' ? (
                                    <video src={url} controls className="w-full aspect-video bg-black" />
                                  ) : (
                                    <div className="p-4 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                                          <FileText className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <span className="text-sm font-medium text-zinc-300">Document Attachment</span>
                                      </div>
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-white transition-colors">
                                        <ExternalLink className="w-5 h-5" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedTicket.adminReply ? (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-3 ml-4 sm:ml-8">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                              <LifeBuoy className="w-4 h-4" />
                              Your Reply
                            </div>
                            <button 
                              onClick={() => handleUpdateTicket(selectedTicket.id, { adminReply: '' })}
                              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              Edit Reply
                            </button>
                          </div>
                          <p className="text-zinc-200 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                        </div>
                      ) : (
                        <div className="ml-4 sm:ml-8 space-y-4">
                          <textarea
                            value={adminReply}
                            onChange={(e) => setAdminReply(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={4}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          />
                          <button
                            onClick={handleReplyTicket}
                            disabled={isReplying || !adminReply.trim()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Send Reply
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800">
                        <button
                          onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'resolved' })}
                          className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'pending' })}
                          className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" />
                          Mark Pending
                        </button>
                        <button
                          onClick={() => setSupportConfirm({ type: 'deny', ticketId: selectedTicket.id, subject: selectedTicket.subject })}
                          className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          Deny Ticket
                        </button>
                      </div>
                    </div>

                    {selectedTicket.feedback && (
                      <div className="pt-8 border-t border-zinc-800 space-y-3">
                        <h3 className="text-sm font-bold text-zinc-400">User Feedback</h3>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-4 h-4 ${selectedTicket.feedback!.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          ))}
                        </div>
                        {selectedTicket.feedback.comment && (
                          <p className="text-zinc-500 text-sm italic">"{selectedTicket.feedback.comment}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <select
                      value={ticketFilter.status}
                      onChange={(e) => setTicketFilter(prev => ({ ...prev, status: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="denied">Denied</option>
                    </select>
                    <select
                      value={ticketFilter.issueType}
                      onChange={(e) => setTicketFilter(prev => ({ ...prev, issueType: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                    >
                      <option value="all">All Issue Types</option>
                      <option value="Bug">Bug Report</option>
                      <option value="Payment">Billing & Payment</option>
                      <option value="Account">Account Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {filteredTickets.length === 0 ? (
                      <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl">
                        <LifeBuoy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No Tickets Found</h3>
                        <p className="text-zinc-500 text-sm">There are no support tickets matching your filters.</p>
                      </div>
                    ) : (
                      filteredTickets.map(ticket => (
                        <motion.div
                          key={ticket.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedTicket(ticket)}
                          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">{ticket.subject}</h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className="font-mono">{ticket.id.slice(0, 8)}</span>
                              <span>•</span>
                              <span>{ticket.email}</span>
                              <span>•</span>
                              <span>{ticket.issueType}</span>
                              <span>•</span>
                              <span>{ticket.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold uppercase tracking-wider shrink-0 w-fit ${
                            ticket.status === 'open' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                            ticket.status === 'pending' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                            'text-green-400 bg-green-400/10 border-green-400/20'
                          }`}>
                            {ticket.status === 'open' ? <AlertCircle className="w-4 h-4" /> :
                             ticket.status === 'pending' ? <Clock className="w-4 h-4" /> :
                             <CheckCircle className="w-4 h-4" />}
                            {ticket.status}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'broadcasts' && (
          <FullScreenPanel title="Broadcast System" onClose={() => setActiveTab('overview')}>
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">New Broadcast</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Send announcements to users</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Title</label>
                    <input 
                      type="text"
                      value={newBroadcast.title || ''}
                      onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Announcement Title"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Message</label>
                    <textarea 
                      value={newBroadcast.message || ''}
                      onChange={(e) => setNewBroadcast(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Type your message here..."
                      rows={4}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Type</label>
                      <select 
                        value={newBroadcast.type || 'info'}
                        onChange={(e) => setNewBroadcast(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="update">Update (Green)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Target Audience</label>
                      <select 
                        value={newBroadcast.target || 'all'}
                        onChange={(e) => setNewBroadcast(prev => ({ ...prev, target: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                      >
                        <option value="all">All Users</option>
                        <option value="specific">Specific Users (Coming Soon)</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={isSendingBroadcast || !newBroadcast.title || !newBroadcast.message}
                    className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                    Send Broadcast
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Recent Broadcasts</h3>
                <div className="space-y-4">
                  {broadcasts.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
                      <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm font-bold">No broadcasts sent yet.</p>
                    </div>
                  ) : (
                    broadcasts.map(broadcast => (
                      <div key={broadcast.id} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              broadcast.type === 'info' ? 'bg-blue-500' :
                              broadcast.type === 'warning' ? 'bg-amber-500' :
                              'bg-green-500'
                            }`} />
                            <h4 className="text-sm font-bold text-white truncate">{broadcast.title}</h4>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">{broadcast.message}</p>
                          <div className="flex items-center gap-3 pt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            <span>{broadcast.createdAt?.toDate?.().toLocaleString() || 'Just now'}</span>
                            <span>•</span>
                            <span>Target: {broadcast.target}</span>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setConfirmAction({ type: 'delete_broadcast', id: broadcast.id, title: broadcast.title })}
                          className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-950 rounded-lg border border-zinc-800 transition-colors shrink-0"
                          title="Delete Broadcast"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </FullScreenPanel>
        )}

        {activeTab === 'planSettings' && (
          <FullScreenPanel title="Plan Settings" onClose={() => setActiveTab('overview')}>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Manage Subscription Tiers</h3>
                  <p className="text-sm text-zinc-500">Configure pricing, quotas, and feature access for all plans.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setConfirmAction({ type: 'reset_plans', id: 'all_plans', title: 'All Plans' })}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Reset to Default
                </button>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {['FREE', 'PRO', 'PLUS', 'ELITE'].map((planId) => {
                  const plan = planSettings.find(p => p.id === planId);
                  if (!plan) return null;

                  return (
                    <div key={planId} className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            planId === 'FREE' ? 'bg-zinc-800 text-zinc-400' :
                            planId === 'PRO' ? 'bg-blue-500/10 text-blue-500' :
                            planId === 'PLUS' ? 'bg-purple-500/10 text-purple-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            <Zap className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-white">{planId}</h4>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Tier Settings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-500">Enabled</span>
                          <button 
                            type="button"
                            onClick={() => handleUpdatePlan(planId as Plan, { isEnabled: !plan.isEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${plan.isEnabled ? 'bg-green-500' : 'bg-zinc-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${plan.isEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Price ($)</label>
                          <input 
                            type="number" 
                            value={plan.price}
                            onChange={(e) => handleUpdatePlan(planId as Plan, { price: Number(e.target.value) })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daily Quota</label>
                          <input 
                            type="number" 
                            value={plan.dailyLimit}
                            onChange={(e) => handleUpdatePlan(planId as Plan, { dailyLimit: Number(e.target.value) })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Max Tokens</label>
                          <input 
                            type="number" 
                            value={plan.maxTokens}
                            onChange={(e) => handleUpdatePlan(planId as Plan, { maxTokens: Number(e.target.value) })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Speed</label>
                          <select 
                            value={plan.speed}
                            onChange={(e) => handleUpdatePlan(planId as Plan, { speed: e.target.value as any })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-700"
                          >
                            <option value="slow">Slow</option>
                            <option value="medium">Medium</option>
                            <option value="fast">Fast</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Performance Settings</label>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                            <div>
                              <p className="text-sm font-bold text-white">High Priority Access</p>
                              <p className="text-[10px] text-zinc-500">Users on this plan get faster response times</p>
                            </div>
                            <div className={`w-10 h-6 rounded-full transition-colors relative ${plan.speed === 'fast' ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${plan.speed === 'fast' ? 'right-1' : 'left-1'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FullScreenPanel>
        )}
        {supportConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                supportConfirm.type === 'delete' || supportConfirm.type === 'deny' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
                {supportConfirm.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <Ban className="w-8 h-8" />}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  {supportConfirm.type === 'delete' ? 'Delete Ticket?' : 'Deny Ticket?'}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to {supportConfirm.type} ticket: <span className="text-white font-bold">{supportConfirm.subject}</span>?
                  {supportConfirm.type === 'delete' && " This will permanently remove the ticket from the database."}
                  {supportConfirm.type === 'deny' && " Please provide a reason for rejection below."}
                </p>
              </div>

              {supportConfirm.type === 'deny' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reason for Rejection</label>
                  <textarea
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Explain why this ticket is being denied..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none text-sm"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setSupportConfirm(null)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={isProcessingAction || (supportConfirm.type === 'deny' && !denyReason.trim())}
                  onClick={() => {
                    if (supportConfirm.type === 'delete') handleDeleteTicket(supportConfirm.ticketId);
                    else if (supportConfirm.type === 'deny') handleDenyTicket(supportConfirm.ticketId);
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    supportConfirm.type === 'delete' || supportConfirm.type === 'deny' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-white text-black hover:bg-zinc-200'
                  } disabled:opacity-50`}
                >
                  {isProcessingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isProcessingAction ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group ${
        active ? 'bg-white text-black' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <motion.div layoutId="admin-nav" className="absolute right-2 w-1.5 h-1.5 bg-black rounded-full" />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    white: 'text-white bg-white/10'
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 space-y-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
