/**
 * Design Tokens - Système de design unifié pour Veille IA
 * Utilisez ces tokens au lieu de valeurs hardcodées
 */

export const colors = {
  // Brand colors
  primary: {
    50: '#FFF5F0',
    100: '#FFE5D9',
    200: '#FFCBB3',
    300: '#FFB08C',
    400: '#FF8A73',
    500: '#FF6B52', // Main brand color
    600: '#FF5A42',
    700: '#E64A32',
    800: '#CC3A22',
    900: '#B32A12',
  },
  coral: {
    400: '#FF8A73',
    500: '#FF6B52',
    600: '#FF5A42',
  },

  // Secondary colors
  secondary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Indigo
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Semantic colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },

  // Neutral colors
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
};

export const transitions = {
  duration: {
    fastest: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
};

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

/**
 * Gradient presets
 */
export const gradients = {
  primary: 'linear-gradient(135deg, #FF6B52 0%, #FF5A42 100%)',
  primaryToCoral: 'linear-gradient(135deg, #FF6B52 0%, #FF8A73 100%)',
  secondary: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
  blueToPurple: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE5D9 50%, #FFCBB3 100%)',
};

/**
 * Component-specific styles
 */
export const components = {
  button: {
    primary: `
      bg-gradient-to-r from-primary-500 to-coral-500
      hover:shadow-xl
      text-white font-semibold
      px-6 py-3 rounded-xl
      transition-all duration-200
      active:scale-95
    `,
    secondary: `
      bg-secondary-500 hover:bg-secondary-600
      text-white font-semibold
      px-6 py-3 rounded-xl
      transition-all duration-200
      active:scale-95
    `,
    outline: `
      border-2 border-neutral-300
      hover:border-primary-500 hover:bg-primary-50
      text-neutral-700 hover:text-primary-600
      font-medium
      px-6 py-3 rounded-xl
      transition-all duration-200
    `,
    ghost: `
      hover:bg-neutral-100
      text-neutral-700 hover:text-neutral-900
      font-medium
      px-6 py-3 rounded-xl
      transition-all duration-200
    `,
  },
  card: {
    base: `
      bg-white rounded-2xl
      border border-neutral-200
      shadow-md hover:shadow-xl
      transition-all duration-300
      p-6
    `,
    interactive: `
      bg-white rounded-2xl
      border border-neutral-200
      shadow-md hover:shadow-xl hover:border-primary-300
      transition-all duration-300
      p-6 cursor-pointer
      active:scale-[0.98]
    `,
  },
  input: {
    base: `
      w-full px-4 py-3
      border-2 border-neutral-300 rounded-xl
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
      transition-all duration-200
      text-neutral-900 placeholder-neutral-400
    `,
  },
};

/**
 * Helper function to create CSS classes
 */
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};
