import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme } from '@/types';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Listen for system theme changes
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

function setupSystemThemeListener(currentTheme: Theme) {
  // Remove existing listener
  if (mediaQueryListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mediaQueryListener);
    mediaQueryListener = null;
  }

  // Add listener only if using system theme
  if (currentTheme === 'system') {
    mediaQueryListener = () => {
      applyTheme('system');
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', mediaQueryListener);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
        setupSystemThemeListener(theme);
      },

      initTheme: () => {
        const { theme } = get();
        applyTheme(theme);
        setupSystemThemeListener(theme);
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
