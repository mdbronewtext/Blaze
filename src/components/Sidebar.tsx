import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  FolderKanban, 
  Zap, 
  Clock, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  LayoutDashboard,
  Shield,
  Code2,
  ImageIcon,
  Search,
  Box,
  Brain,
  Lock,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  MoreVertical,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { ChatThread, UserProfile, AIModule, PlanSettings, ModuleSettings, UserSettings } from '../types';
import { NotificationBell } from './NotificationBell';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  chats: ChatThread[];
  currentChatId: string | null;
  activePage: 'chat' | 'settings' | 'profile' | 'pricing' | 'tools' | 'admin' | 'support';
  currentModule: AIModule;
  planSettings: Record<string, PlanSettings>;
  moduleSettings: ModuleSettings;
  userSettings?: UserSettings;
  onNavigate: (page: 'chat' | 'settings' | 'profile' | 'pricing' | 'tools' | 'admin' | 'support') => void;
  onModuleChange: (module: AIModule) => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onLogout: () => void;
  user: UserProfile | null;
  privacyMode?: boolean;
  onPinChat: (id: string, isPinned: boolean) => void;
  onRenameChat: (id: string, title: string) => void;
  onArchiveChat: (id: string, isArchived: boolean) => void;
  onDeleteChat: (id: string) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}

export const Sidebar = React.memo(({ 
  isOpen, 
  setIsOpen, 
  chats, 
  currentChatId,
  activePage,
  currentModule,
  planSettings,
  moduleSettings,
  userSettings,
  onNavigate,
  onModuleChange,
  onNewChat, 
  onSelectChat, 
  onLogout,
  user,
  privacyMode = false,
  onPinChat,
  onRenameChat,
  onArchiveChat,
  onDeleteChat,
  showArchived,
  onToggleArchived
}: SidebarProps) => {
  const isOwner = user?.role === 'owner';
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [renameTitle, setRenameTitle] = React.useState('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filteredChats = chats.filter(chat => showArchived ? chat.isArchived : !chat.isArchived);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 280 : 0 }}
        className="fixed md:relative h-full glass-panel border-r border-white/5 flex flex-col overflow-hidden z-50 md:z-40 shrink-0"
      >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="font-bold text-xl tracking-tight">BLAZE-AI</span>
        </div>
        <div className="flex items-center gap-1">
          {user && <NotificationBell user={user} settings={userSettings} />}
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <motion.button 
          type="button"
          onClick={() => {
            onNavigate('chat');
            onNewChat();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-2 px-4 py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-6 py-4">
        {/* Modules Section */}
        <div className="space-y-2">
          <div className="px-3 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Box className="w-3 h-3" />
            <span>Modules</span>
          </div>
          <div className="space-y-1">
            {(isOwner || moduleSettings.chat) && (
              <SidebarItem 
                icon={<MessageSquare className="w-4 h-4" />} 
                label="AI Chat" 
                active={currentModule === 'chat' && activePage === 'chat'} 
                onClick={() => {
                  onModuleChange('chat');
                  onNavigate('chat');
                }}
                disabled={!isOwner && !moduleSettings.chat}
              />
            )}
            {(isOwner || moduleSettings.code) && (
              <SidebarItem 
                icon={<Code2 className="w-4 h-4" />} 
                label="Code Master" 
                active={currentModule === 'code' && activePage === 'chat'} 
                onClick={() => {
                  onModuleChange('code');
                  onNavigate('chat');
                }}
                disabled={!isOwner && !moduleSettings.code}
              />
            )}
            {(isOwner || moduleSettings.image) && (
              <SidebarItem 
                icon={<ImageIcon className="w-4 h-4" />} 
                label="Vision AI" 
                active={currentModule === 'image' && activePage === 'chat'} 
                onClick={() => {
                  onModuleChange('image');
                  onNavigate('chat');
                }}
                disabled={!isOwner && !moduleSettings.image}
              />
            )}
            {(isOwner || moduleSettings.search) && (
              <SidebarItem 
                icon={<Search className="w-4 h-4" />} 
                label="Research" 
                active={currentModule === 'research' && activePage === 'chat'} 
                onClick={() => {
                  onModuleChange('research');
                  onNavigate('chat');
                }}
                disabled={!isOwner && !moduleSettings.search}
              />
            )}
          </div>
        </div>

        {/* Main Links */}
        <div className="space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activePage === 'chat' && !currentChatId} 
            onClick={() => {
              onNavigate('chat');
              onNewChat();
            }}
          />
          <SidebarItem 
            icon={<Settings className="w-4 h-4" />} 
            label="Settings" 
            active={activePage === 'settings'} 
            onClick={() => onNavigate('settings')}
          />
          <SidebarItem 
            icon={<Brain className="w-4 h-4" />} 
            label="Memory" 
            active={activePage === 'tools'} 
            onClick={() => onNavigate('tools')}
            disabled={!isOwner && !moduleSettings.tools}
          />
          <SidebarItem 
            icon={<User className="w-4 h-4" />} 
            label="Profile" 
            active={activePage === 'profile'} 
            onClick={() => onNavigate('profile')}
          />
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <SidebarItem 
              icon={<Shield className="w-4 h-4" />} 
              label="Admin Panel" 
              active={activePage === 'admin'} 
              onClick={() => onNavigate('admin')}
            />
          )}
        </div>

        {/* Recents */}
        <div className="space-y-2">
          <div className="px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>{showArchived ? 'Archived' : 'Recents'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleArchived}
                className={`p-1 rounded-md transition-colors ${showArchived ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-zinc-800 text-zinc-500'}`}
                title={showArchived ? "Show Recents" : "Show Archived"}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              {privacyMode && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[8px] font-black text-blue-400 uppercase tracking-widest">
                  <Lock className="w-2.5 h-2.5" />
                  Private
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            {filteredChats.map(chat => {
              const isActive = currentChatId === chat.id && activePage === 'chat';
              const isMenuOpen = menuOpenId === chat.id;

              return (
                <div key={chat.id} className="relative group px-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onNavigate('chat');
                      onSelectChat(chat.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onNavigate('chat');
                        onSelectChat(chat.id);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 relative cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800/50 text-white shadow-sm' 
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="sidebar-active-chat"
                        className="absolute left-0 w-1 h-4 bg-white rounded-r-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                    {chat.isPinned ? (
                      <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                    ) : (
                      <MessageSquare className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-50 group-hover:opacity-100'} transition-opacity`} />
                    )}
                    <span className={`truncate flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{chat.title}</span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(isMenuOpen ? null : chat.id);
                      }}
                      className={`p-1 hover:bg-zinc-800 rounded-md transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-[60]" 
                          onClick={() => setMenuOpenId(null)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-4 top-10 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[70] py-1 overflow-hidden"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinChat(chat.id, !chat.isPinned);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            {chat.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            {chat.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameId(chat.id);
                              setRenameTitle(chat.title);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Rename Chat
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveChat(chat.id, !chat.isArchived);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            {chat.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                            {chat.isArchived ? 'Unarchive' : 'Archive Chat'}
                          </button>
                          <div className="h-px bg-zinc-800 my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(chat.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Chat
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {filteredChats.length === 0 && (
              <div className="px-3 py-2 text-xs text-zinc-600 italic">
                {showArchived ? 'No archived chats' : 'No recent chats'}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Upgrade Banner */}
      {user?.plan === 'FREE' && (
        <div className="px-4 py-4">
          <div className="p-4 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700/50 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Crown className="w-4 h-4 fill-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Upgrade</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Unlock full power with BLAZE-AI Pro
            </p>
            <button 
              type="button"
              onClick={() => onNavigate('pricing')}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800/50 space-y-4">
        {user && (
          <div className="px-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-400">Usage</span>
              <span className="text-zinc-500">
                {user.dailyUsage || 0} / {user.role === 'owner' ? '∞' : (planSettings[user.plan]?.dailyLimit >= 1000 ? '∞' : (planSettings[user.plan]?.dailyLimit || 20))}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${user.role === 'owner' ? 'bg-amber-500' : (user.plan === 'ELITE' ? 'bg-purple-500' : user.plan === 'PLUS' ? 'bg-amber-500' : user.plan === 'PRO' ? 'bg-blue-500' : 'bg-zinc-500')}`}
                style={{ width: `${user.role === 'owner' ? 100 : Math.min(100, ((user.dailyUsage || 0) / (planSettings[user.plan]?.dailyLimit || 20)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <motion.button 
          type="button"
          onClick={onLogout}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </motion.button>
        
        {user && (
          <div className="pt-2 flex items-center gap-3 px-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('profile')}>
            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-full h-full p-1.5 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">{user.displayName || 'User'}</p>
                {user.role === 'owner' ? (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-0.5">
                    👑 OWNER
                  </span>
                ) : user.role === 'admin' ? (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                    ADMIN
                  </span>
                ) : (
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${user.plan === 'ELITE' ? 'bg-purple-500/20 text-purple-400' : user.plan === 'PLUS' ? 'bg-amber-500/20 text-amber-400' : user.plan === 'PRO' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {user.plan}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>

    {/* Rename Modal */}
    <AnimatePresence>
      {renameId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <Pencil className="w-8 h-8" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">Rename Chat</h3>
              <p className="text-zinc-400 text-sm">Enter a new title for this conversation.</p>
            </div>

            <div className="space-y-2">
              <input
                autoFocus
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameChat(renameId, renameTitle);
                    setRenameId(null);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Chat title..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setRenameId(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onRenameChat(renameId, renameTitle);
                  setRenameId(null);
                }}
                className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-sm transition-all"
              >
                Rename
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Delete Modal */}
    <AnimatePresence>
      {deleteId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">Delete Chat?</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Are you sure you want to delete this chat? This action is irreversible and will remove all messages.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDeleteChat(deleteId);
                  setDeleteId(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
});

function SidebarItem({ icon, label, active = false, onClick, disabled = false }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, disabled?: boolean }) {
  return (
    <motion.button 
      type="button"
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { x: 4, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative group ${
      active 
        ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10' 
        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent hover:border-white/5'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-5 bg-white rounded-r-full shadow-[0_0_10px_#fff]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      <span className={`${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
        {icon}
      </span>
      <span className="font-semibold flex-1 text-left">{label}</span>
      {disabled && (
        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
          OFF
        </span>
      )}
    </motion.button>
  );
}
