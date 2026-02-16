export type ColorToken = {
  oklch: string;
  hex: string;
  usage: string;
};

export const semanticPalette = {
  background: { oklch: 'oklch(0.9851 0 0)', hex: '#FAFAFA', usage: 'App background' },
  foreground: { oklch: 'oklch(0 0 0)', hex: '#000000', usage: 'Primary text' },
  primary: { oklch: 'oklch(0.5144 0.1605 267.44)', hex: '#3F5EC2', usage: 'Primary actions' },
  'primary-foreground': { oklch: 'oklch(0.97 0.014 254.604)', hex: '#EFF6FF', usage: 'Text on primary' },
  secondary: { oklch: 'oklch(0.94 0 0)', hex: '#EBEBEB', usage: 'Secondary surfaces' },
  'secondary-foreground': { oklch: 'oklch(0.25 0 0)', hex: '#222222', usage: 'Text on secondary' },
  accent: { oklch: 'oklch(0.9214 0.0248 257.65)', hex: '#DBE6F6', usage: 'Accent surfaces' },
  'accent-foreground': { oklch: 'oklch(0.2571 0.1161 272.24)', hex: '#14185A', usage: 'Accent text/icons' },
  card: { oklch: 'oklch(1 0 0)', hex: '#FFFFFF', usage: 'Card background' },
  'card-foreground': { oklch: 'oklch(0.2046 0 0)', hex: '#171717', usage: 'Card text' },
  popover: { oklch: 'oklch(1 0 0)', hex: '#FFFFFF', usage: 'Popover background' },
  'popover-foreground': { oklch: 'oklch(0 0 0)', hex: '#000000', usage: 'Popover text' },
  muted: { oklch: 'oklch(0.97 0 0)', hex: '#F5F5F5', usage: 'Muted backgrounds' },
  'muted-foreground': { oklch: 'oklch(0.44 0 0)', hex: '#525252', usage: 'Muted text' },
  border: { oklch: 'oklch(0.92 0 0)', hex: '#E4E4E4', usage: 'Borders' },
  input: { oklch: 'oklch(0.94 0 0)', hex: '#EBEBEB', usage: 'Input backgrounds' },
  ring: { oklch: 'oklch(0.5144 0.1605 267.44)', hex: '#3F5EC2', usage: 'Focus ring' },
  destructive: { oklch: 'oklch(0.58 0.22 27)', hex: '#DF2225', usage: 'Error/destructive action' },
  'destructive-foreground': { oklch: 'oklch(0.97 0.014 254.604)', hex: '#EFF6FF', usage: 'Text on destructive' },
} as const satisfies Record<string, ColorToken>;

export const chartPalette = {
  1: { oklch: 'oklch(0.9214 0.0248 257.65)', hex: '#DBE6F6', usage: 'Chart series 1' },
  2: { oklch: 'oklch(0.7597 0.0804 267.01)', hex: '#9AB0E5', usage: 'Chart series 2' },
  3: { oklch: 'oklch(0.6083 0.1247 272.72)', hex: '#6A7CCD', usage: 'Chart series 3' },
  4: { oklch: 'oklch(0.5144 0.1605 267.44)', hex: '#3F5EC2', usage: 'Chart series 4' },
  5: { oklch: 'oklch(0.2571 0.1161 272.24)', hex: '#14185A', usage: 'Chart series 5' },
} as const;

export const sidebarPalette = {
  background: { oklch: 'oklch(1 0 0)', hex: '#FFFFFF', usage: 'Sidebar background' },
  foreground: { oklch: 'oklch(0.2046 0 0)', hex: '#171717', usage: 'Sidebar text' },
  primary: { oklch: 'oklch(0.5144 0.1605 267.44)', hex: '#3F5EC2', usage: 'Sidebar active item' },
  'primary-foreground': { oklch: 'oklch(1 0 0)', hex: '#FFFFFF', usage: 'Text on sidebar primary' },
  accent: { oklch: 'oklch(0.9214 0.0248 257.65)', hex: '#DBE6F6', usage: 'Sidebar accent backgrounds' },
  'accent-foreground': { oklch: 'oklch(0.2571 0.1161 272.24)', hex: '#14185A', usage: 'Sidebar accent text' },
  border: { oklch: 'oklch(0.92 0 0)', hex: '#E4E4E4', usage: 'Sidebar borders' },
  ring: { oklch: 'oklch(0.5144 0.1605 267.44)', hex: '#3F5EC2', usage: 'Sidebar focus ring' },
} as const;

// Tailwind-like scales to allow utility usage such as bg-brand-500 or text-muted-foreground
export const scales = {
  brand: {
    50: '#EFF3FF',
    100: '#DBE6F6',
    200: '#C8D7F1',
    300: '#A8BCE8',
    400: '#6A7CCD',
    500: '#3F5EC2',
    600: '#334DA6',
    700: '#293D8A',
    800: '#1F2D6E',
    900: '#14185A',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EBEBEB',
    300: '#E4E4E4',
    400: '#CFCFCF',
    500: '#8A8A8A',
    600: '#737373',
    700: '#525252',
    800: '#222222',
    900: '#171717',
  },
  accent: {
    50: '#F4F7FD',
    100: '#DBE6F6',
    200: '#C9D9F0',
    300: '#B3C9EB',
    400: '#9AB0E5',
    500: '#6A7CCD',
    600: '#3F5EC2',
    700: '#334DA6',
    800: '#293D8A',
    900: '#14185A',
  },
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DF2225',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
} as const;

export const statusPalette = {
  open: '#3F5EC2',
  analysis: '#D97706',
  resolved: '#059669',
  closed: '#525252',
} as const;

export const severityPalette = {
  light: '#3F5EC2',
  intermediate: '#D97706',
  serious: '#B45309',
  critical: '#DF2225',
} as const;
