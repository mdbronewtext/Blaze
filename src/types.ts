export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type Plan = 'FREE' | 'PLUS' | 'PRO' | 'ELITE' | 'OWNER';

export const PLAN_ORDER: Record<Plan, number> = {
  'FREE': 0,
  'PRO': 1,
  'PLUS': 2,
  'ELITE': 3,
  'OWNER': 4
};

export type AIMode = 'lite' | 'smart' | 'beast';
export type AIModel = string;
export type ThemePreset = 'light' | 'dark' | 'glass' | 'forest' | 'sunset' | 'midnight' | 'ocean' | 'coffee' | 'rose' | 'custom';
export type Theme = 'light' | 'dark' | 'system';

export interface CustomColors {
  accent: string;
  card: string;
  text: string;
  bg: string;
}

export interface UserSettings {
  theme: ThemePreset;
  customColors?: CustomColors;
  fontSize: 'small' | 'medium' | 'large';
  aiMode: 'fast' | 'smart' | 'pro';
  responseStyle: 'short' | 'detailed' | 'step-by-step';
  saveHistory: boolean;
  privacyMode: boolean;
  personalization: boolean;
  emailNotifications: boolean;
  soundAlerts: boolean;
  apiKey: string;
  language: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  plan: Plan;
  role?: 'admin' | 'user' | 'owner';
  status: 'active' | 'blocked';
  twoFactorEnabled?: boolean;
  createdAt: any;
  lastLogin?: any;
  theme: Theme;
  mode: AIMode;
  selectedModel?: AIModel;
  credits?: number;
  dailyUsage?: number;
  totalUsage?: number;
  lastReset?: any;
}

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Attachment {
  type: 'file' | 'image';
  url: string; // Base64 data URL
  name: string;
  mimeType: string;
  size?: number;
  extractedText?: string;
}

export interface Message {
  id: string;
  userId: string;
  threadId: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: any;
  chatId?: string;
  attachment?: Attachment;
  modelUsed?: AIModel;
  isStopped?: boolean;
}

export interface MemoryItem {
  id: string;
  userId: string;
  content: string;
  category: 'preference' | 'fact' | 'instruction';
  createdAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

export interface SystemSettings {
  id: 'global';
  temperature: number;
  defaultModel: AIModel;
  responseStyle: string;
  globalSystemPrompt: string;
  rateLimits: {
    free: number;
    pro: number;
  };
}

export interface RedeemCode {
  id: string;
  code: string;
  plan: Plan;
  credits: number;
  maxUses: number;
  usedCount: number;
  expiryDate: any;
}

export interface UserRedeem {
  id: string;
  userId: string;
  code: string;
  createdAt: any;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  details: string;
  timestamp: any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  issueType: 'Bug' | 'Payment' | 'Account' | 'Other';
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'denied';
  adminReply?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
  mediaUrl?: string[];
  mediaType?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface PlanSettings {
  id: Plan;
  name: Plan;
  price: number;
  dailyLimit: number;
  maxTokens: number;
  speed: 'slow' | 'medium' | 'fast';
  isEnabled: boolean;
  rateLimitPerMin?: number;
}

export interface AppSettings {
  maintenance: boolean;
  message: string;
  allowAdmins: boolean;
  scheduledEnd?: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'support' | 'system' | 'billing';
  message: string;
  read: boolean;
  createdAt: any;
  link?: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'update';
  target: 'all' | 'specific';
  userIds?: string[];
  createdAt: any;
  expiresAt?: any;
  createdBy: string;
}

export interface UserBroadcast {
  id: string;
  userId: string;
  broadcastId: string;
  read: boolean;
  readAt: any;
}
