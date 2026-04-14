import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Broadcast, UserBroadcast, UserProfile, OperationType } from '../types';
import { Bell, X, Info, AlertTriangle, Zap } from 'lucide-react';

interface BroadcastBannerProps {
  user: UserProfile;
}

export function BroadcastBanner({ user }: BroadcastBannerProps) {
  const [activeBroadcasts, setActiveBroadcasts] = useState<Broadcast[]>([]);
  const [readBroadcastIds, setReadBroadcastIds] = useState<Set<string>>(new Set());
  const [currentBroadcastIndex, setCurrentBroadcastIndex] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch active broadcasts
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    const unsubBroadcasts = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const broadcasts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Broadcast))
        .filter(b => {
          // Check expiry
          if (b.expiresAt) {
            const expiry = b.expiresAt.toDate ? b.expiresAt.toDate() : new Date(b.expiresAt);
            if (now > expiry) return false;
          }
          // Check target
          if (b.target === 'specific' && b.userIds && !b.userIds.includes(user.uid)) {
            return false;
          }
          return true;
        });
      setActiveBroadcasts(broadcasts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'broadcasts'));

    // Fetch user's read status
    const readQ = query(collection(db, 'userBroadcasts'), where('userId', '==', user.uid));
    const unsubRead = onSnapshot(readQ, (snapshot) => {
      const readIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserBroadcast;
        if (data.read) readIds.add(data.broadcastId);
      });
      setReadBroadcastIds(readIds);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'userBroadcasts'));

    return () => {
      unsubBroadcasts();
      unsubRead();
    };
  }, [user]);

  const unreadBroadcasts = activeBroadcasts.filter(b => !readBroadcastIds.has(b.id));

  const handleDismiss = async (broadcastId: string) => {
    try {
      const userBroadcastRef = doc(collection(db, 'userBroadcasts'));
      await setDoc(userBroadcastRef, {
        userId: user.uid,
        broadcastId: broadcastId,
        read: true,
        readAt: serverTimestamp()
      });
      
      // Move to next broadcast if available, otherwise it will just disappear
      if (currentBroadcastIndex >= unreadBroadcasts.length - 1) {
        setCurrentBroadcastIndex(Math.max(0, unreadBroadcasts.length - 2));
      }
    } catch (error) {
      console.error("Error dismissing broadcast:", error);
    }
  };

  if (unreadBroadcasts.length === 0) return null;

  const broadcast = unreadBroadcasts[currentBroadcastIndex];
  if (!broadcast) return null;

  const getStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'update': return 'bg-green-500/10 border-green-500/20 text-green-500';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'update': return <Zap className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={broadcast.id}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4"
      >
        <div className={`backdrop-blur-xl border rounded-2xl p-4 shadow-2xl flex items-start gap-4 ${getStyle(broadcast.type)}`}>
          <div className="shrink-0 mt-1">
            {getIcon(broadcast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-bold text-sm text-white truncate">{broadcast.title}</h4>
              <div className="flex items-center gap-2 shrink-0">
                {unreadBroadcasts.length > 1 && (
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {currentBroadcastIndex + 1} of {unreadBroadcasts.length}
                  </span>
                )}
                <button 
                  onClick={() => handleDismiss(broadcast.id)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm mt-1 opacity-90 leading-relaxed">{broadcast.message}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
