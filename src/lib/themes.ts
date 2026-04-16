import { ThemePreset, CustomColors } from '../types';

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  colors: CustomColors;
  isDark: boolean;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: { accent: '#3b82f6', bg: '#09090b', text: '#fafafa', card: '#18181b' },
    isDark: true
  },
  {
    id: 'light',
    name: 'Light',
    colors: { accent: '#2563eb', bg: '#ffffff', text: '#09090b', card: '#f4f4f5' },
    isDark: false
  },
  {
    id: 'glass',
    name: 'Glass',
    colors: { accent: '#60a5fa', bg: '#020617', text: '#f1f5f9', card: 'rgba(255, 255, 255, 0.03)' },
    isDark: true
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: { accent: '#10b981', bg: '#064e3b', text: '#ecfdf5', card: '#065f46' },
    isDark: true
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: { accent: '#f59e0b', bg: '#451a03', text: '#fef3c7', card: '#78350f' },
    isDark: true
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: { accent: '#818cf8', bg: '#020617', text: '#e0e7ff', card: '#1e1b4b' },
    isDark: true
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: { accent: '#0ea5e9', bg: '#0c4a6e', text: '#f0f9ff', card: '#075985' },
    isDark: true
  },
  {
    id: 'coffee',
    name: 'Coffee',
    colors: { accent: '#d97706', bg: '#2d1a12', text: '#fdf8f6', card: '#4a3728' },
    isDark: true
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: { accent: '#e11d48', bg: '#4c0519', text: '#fff1f2', card: '#881337' },
    isDark: true
  }
];

export const applyTheme = (theme: ThemePreset, customColors?: CustomColors) => {
  const root = document.documentElement;
  const preset = THEME_PRESETS.find(p => p.id === theme);
  const colors = theme === 'custom' && customColors ? customColors : (preset?.colors || THEME_PRESETS[0].colors);

  root.style.setProperty('--accent-color', colors.accent);
  root.style.setProperty('--bg-color', colors.bg);
  root.style.setProperty('--text-color', colors.text);
  root.style.setProperty('--card-color', colors.card);
  root.style.setProperty('--zinc-950', colors.bg); // Sync with standard palette
  
  if (preset?.isDark || theme === 'midnight' || theme === 'forest' || theme === 'sunset' || theme === 'ocean' || theme === 'coffee' || theme === 'rose' || theme === 'glass') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else if (theme === 'custom') {
    // For custom, try to guess dark/light based on bg
    const isDark = isColorDark(colors.bg);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }
};

function isColorDark(color: string) {
  if (!color) return true;
  if (color.startsWith('rgba')) return true;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}
