export const THEME = {
  colors: {
    primary: '#FF5500',       // KARP Vibrant Orange
    primaryDark: '#D94500',
    primaryLight: '#FFE5D6',
    secondary: '#0B3C5D',     // KARP Deep Navy Blue
    secondaryDark: '#072A42',
    secondaryLight: '#E0F2FE',
    background: '#F8FAFC',    // Modern Slate/Ice Background
    surface: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    card: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0284C7',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: '#0F172A',
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#0F172A',
    },
    body: {
      fontSize: 14,
      color: '#0F172A',
    },
    caption: {
      fontSize: 12,
      color: '#64748B',
    },
    metric: {
      fontSize: 42,
      fontWeight: '800' as const,
      color: '#0F172A',
    },
  },
};
