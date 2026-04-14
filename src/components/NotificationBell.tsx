import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification, UserProfile, UserSettings } from '../types';

interface NotificationBellProps {
  user: UserProfile;
  settings?: UserSettings;
}

export function NotificationBell({ user, settings }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (unreadCount > prevUnreadCount && settings?.soundAlerts) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, settings?.soundAlerts]);

  useEffect(() => {
    if (!user?.uid) return;
    
    // For admins, we also want to see 'admin' notifications
    const targetId = user.role === 'admin' || user.role === 'owner' ? 'admin' : user.uid;
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [user.uid, 'admin']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl border border-zinc-800/50 transition-all relative group"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-400' : 'text-zinc-400'} group-hover:scale-110 transition-transform`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-zinc-950 animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                <h3 className="font-bold text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] rounded-full">{unreadCount} new</span>}
                </h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                      <Bell className="w-6 h-6 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={`p-4 hover:bg-zinc-900/50 transition-colors relative group ${!n.read ? 'bg-blue-600/5' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-transparent'}`} />
                          <div className="flex-1 space-y-1">
                            <p className={`text-sm leading-relaxed ${!n.read ? 'text-white font-medium' : 'text-zinc-400'}`}>
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                                {n.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                              </span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.read && (
                                  <button 
                                    onClick={() => markAsRead(n.id)}
                                    className="p-1 hover:text-blue-400 text-zinc-600 transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteNotification(n.id)}
                                  className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
