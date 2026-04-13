import type { ThemeState } from '@/types/store';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (dark: boolean) => {
    if (dark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            isDark: false,
            toggleTheme: () => {
                const newValue = !get().isDark;
                set({ isDark: newValue });
                applyTheme(newValue);
            },
            setTheme: (dark: boolean) => {
                set({ isDark: dark });
                applyTheme(dark);
            },
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) applyTheme(state.isDark);
            },
        }
    )
);