import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Plus, Trash2, Tag, Clock, Save, X } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MemoryItem } from '../types';

interface MemoryManagerProps {
  userId: string;
  memories: MemoryItem[];
}

export function MemoryManager({ userId, memories }: MemoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('fact');

  const handleAddMemory = async () => {
    if (!newContent.trim()) return;
    try {
      await addDoc(collection(db, 'memories'), {
        userId,
        content: newContent.trim(),
        category: newCategory,
        createdAt: serverTimestamp()
      });
      setNewContent('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding memory:", error);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'memories', id));
    } catch (error) {
      console.error("Error deleting memory:", error);
    }
  };

  const getCategoryIcon = (category: MemoryItem['category']) => {
    switch (category) {
      case 'preference': return <Tag className="w-3 h-3 text-purple-400" />;
      case 'fact': return <Brain className="w-3 h-3 text-blue-400" />;
      case 'instruction': return <Clock className="w-3 h-3 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Brain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Memory System</h3>
            <p className="text-xs text-zinc-500">Manage facts and preferences the AI remembers about you.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Fact
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4"
          >
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What should the AI remember? (e.g. 'I prefer TypeScript over JavaScript')"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['fact', 'preference', 'instruction'] as const).map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      newCategory === cat 
                        ? 'bg-zinc-800 text-white border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3">
        {memories.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-500">No memories stored yet. Add something for the AI to remember!</p>
          </div>
        ) : (
          memories.map((memory) => (
            <motion.div
              key={memory.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group p-4 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-start justify-between gap-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-md">
                    {getCategoryIcon(memory.category)}
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{memory.category}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{memory.content}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteMemory(memory.id)}
                className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
