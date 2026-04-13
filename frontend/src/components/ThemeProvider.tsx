import { useLayoutEffect } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const isDark = useThemeStore((state) => state.isDark);

    useLayoutEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDark]);

    return <>{children}</>;
};