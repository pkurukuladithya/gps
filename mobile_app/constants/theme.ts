export const THEME = {
  colors: {
    primary: '#F5C400',
    primaryDark: '#D4A800',
    primaryLight: '#FFF2B2',
    background: '#F7F7F5',
    surface: '#FFFFFF',
    text: '#1C1C1C',
    textMuted: '#777777',
    border: '#E8E8E4',
    card: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    overlay: 'rgba(0,0,0,0.4)',
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
      color: '#1C1C1C',
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#1C1C1C',
    },
    body: {
      fontSize: 14,
      color: '#1C1C1C',
    },
    caption: {
      fontSize: 12,
      color: '#777777',
    },
    metric: {
      fontSize: 42,
      fontWeight: '800' as const,
      color: '#1C1C1C',
    },
  },
};
