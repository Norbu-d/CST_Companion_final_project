// src/theme/theme.js
// Centralized design tokens: colors, typography, spacing, shadows

import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const colors = {
  // Primary brand
  primary: '#1A3C6E',
  primaryDark: '#0F2549',
  primaryLight: '#2A5298',

  // Accent
  accent: '#F4A623',
  accentLight: '#FEF3C7',

  // Backgrounds
  background: '#F1F3F7',
  card: '#FFFFFF',
  cardAlt: '#F8F9FB',

  // Text
  text: '#1C1C1E',
  textSecondary: '#4B5563',
  textLight: '#9CA3AF',

  // Border
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status colors
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  blueDark: '#1D4ED8',

  green: '#10B981',
  greenLight: '#D1FAE5',
  greenDark: '#065F46',

  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',

  red: '#EF4444',
  redLight: '#FEE2E2',
  redDark: '#991B1B',

  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  purpleDark: '#6D28D9',

  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  pinkDark: '#9D174D',

  indigo: '#6366F1',
  indigoLight: '#E0E7FF',
  indigoDark: '#3730A3',

  teal: '#14B8A6',
  tealLight: '#CCFBF1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text, lineHeight: 21 },
  bodySmall: { fontSize: 12, fontWeight: '400', color: colors.textSecondary, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500', color: colors.textLight },
  label: { fontSize: 10, fontWeight: '600', color: colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase' },
};

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    android: { elevation: 1 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 3 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 6 },
  }),
};

// Department color map — used across contacts
export const DEPT_COLORS = {
  IT:       { bg: colors.blueLight,   text: colors.blueDark,   dot: colors.blue },
  Admin:    { bg: colors.purpleLight, text: colors.purpleDark, dot: colors.purple },
  Library:  { bg: colors.greenLight,  text: colors.greenDark,  dot: colors.green },
  Health:   { bg: colors.redLight,    text: colors.redDark,    dot: colors.red },
  Security: { bg: colors.amberLight,  text: colors.amberDark,  dot: colors.amber },
  Services: { bg: colors.pinkLight,   text: colors.pinkDark,   dot: colors.pink },
  Finance:  { bg: colors.indigoLight, text: colors.indigoDark, dot: colors.indigo },
};

// Notice category color map
export const NOTICE_COLORS = {
  Exam:     colors.red,
  Academic: colors.amber,
  Event:    colors.green,
  Notice:   colors.indigo,
};

// Class type color map
export const CLASS_TYPE_COLORS = {
  Lab:      colors.blue,
  Lecture:  colors.green,
  Tutorial: colors.amber,
  Workshop: colors.purple,
};