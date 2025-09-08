// Numdle App Color Palette
export const colors = {
  // Primary brand colors
  primary: {
    50: '#fef2f2',   // Very light red tint
    100: '#fee2e2',  // Light red tint
    200: '#fecaca',  // Lighter red
    300: '#fca5a5',  // Light red
    400: '#f87171',  // Medium red
    500: '#ef4444',  // Red
    600: '#dc2626',  // Darker red
    700: '#b91c1c',  // Dark red
    800: '#991b1b',  // Very dark red
    900: '#901c15',  // Brand primary - Deep burgundy red
    950: '#7f1d1d',  // Darkest red
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',   // Very light gray
    100: '#f1f5f9',  // Light gray
    200: '#e2e8f0',  // Lighter gray
    300: '#cbd5e1',  // Light gray
    400: '#94a3b8',  // Medium gray
    500: '#64748b',  // Gray
    600: '#4C5454',  // Brand secondary - Charcoal gray
    700: '#374151',  // Dark gray
    800: '#1f2937',  // Very dark gray
    900: '#111827',  // Darkest gray
  },

  // Neutral/Background
  neutral: {
    50: '#F2F4F3',   // Brand neutral - Light sage background
    100: '#f7fafc',  // Very light
    200: '#edf2f7',  // Light
    300: '#e2e8f0',  // Medium light
    400: '#cbd5e1',  // Medium
    500: '#a0aec0',  // Medium dark
    600: '#718096',  // Dark
    700: '#4a5568',  // Very dark
    800: '#2d3748',  // Darkest
    900: '#1a202c',  // Black
  },

  // Success/Positive
  success: {
    50: '#f0fdf4',   // Very light green
    100: '#dcfce7',  // Light green
    200: '#bbf7d0',  // Lighter green
    300: '#86efac',  // Light green
    400: '#4ade80',  // Medium green
    500: '#57A773',  // Brand success - Forest green
    600: '#16a34a',  // Green
    700: '#15803d',  // Dark green
    800: '#166534',  // Very dark green
    900: '#14532d',  // Darkest green
  },

  // Warning/Accent
  warning: {
    50: '#fffbeb',   // Very light orange
    100: '#fef3c7',  // Light orange
    200: '#fde68a',  // Lighter orange
    300: '#fcd34d',  // Light orange
    400: '#fbbf24',  // Medium orange
    500: '#F29E4C',  // Brand warning - Warm orange
    600: '#d97706',  // Orange
    700: '#b45309',  // Dark orange
    800: '#92400e',  // Very dark orange
    900: '#78350f',  // Darkest orange
  },

  // Semantic colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#901c15',  // Uses brand primary for errors
  },

  // Game-specific colors
  game: {
    strikes: '#dc2626',     // Red for strikes
    balls: '#F29E4C',       // Brand warning for balls
    correct: '#57A773',     // Brand success for correct
    teamA: '#3b82f6',       // Blue for team A
    teamB: '#8b5cf6',       // Purple for team B
  }
} as const;

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// Common color combinations
export const colorCombinations = {
  primary: {
    bg: colors.primary[900],
    text: colors.neutral[50],
    hover: colors.primary[800],
    border: colors.primary[700],
  },
  secondary: {
    bg: colors.secondary[600],
    text: colors.neutral[50],
    hover: colors.secondary[700],
    border: colors.secondary[500],
  },
  success: {
    bg: colors.success[500],
    text: colors.neutral[50],
    hover: colors.success[600],
    border: colors.success[400],
  },
  warning: {
    bg: colors.warning[500],
    text: colors.neutral[900],
    hover: colors.warning[600],
    border: colors.warning[400],
  },
  neutral: {
    bg: colors.neutral[50],
    text: colors.secondary[600],
    hover: colors.neutral[100],
    border: colors.neutral[200],
  }
} as const;
