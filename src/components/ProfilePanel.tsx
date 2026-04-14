import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Check, X, Zap, Loader2, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfilePanelProps {
  user: UserProfile;
  onUpdateUser: (updates: Partial<UserProfile>) => Promise<void>;
  onNavigate: (page: any) => void;
}

export function ProfilePanel({ user, onUpdateUser, onNavigate }: ProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [username, setUsername] = useState(user.username || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateUser({
        displayName,
        username,
        photoURL
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoURL(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
          title="Back to Settings"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-500 group-hover:text-white" />
        </button>
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Profile</h2>
          <p className="text-zinc-500 text-sm">Manage your personal information and how others see you.</p>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8">
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden border-4 border-zinc-900 shadow-2xl">
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-4xl font-bold">
                  {displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isEditing && (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {!isEditing ? (
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">{user.displayName || 'No Name Set'}</h3>
              <p className="text-zinc-400">@{user.username || 'username'}</p>
              <p className="text-zinc-500 text-sm">{user.email}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-zinc-300">
                <Zap className="w-3 h-3" />
                {user.plan} Plan
              </div>
              <div className="pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-white text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">@</span>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-white text-black rounded-2xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.displayName || '');
                    setUsername(user.username || '');
                    setPhotoURL(user.photoURL || '');
                  }}
                  disabled={isSaving}
                  className="px-6 py-3 bg-zinc-800 text-white rounded-2xl font-bold text-sm hover:bg-zinc-700 transition-all flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
