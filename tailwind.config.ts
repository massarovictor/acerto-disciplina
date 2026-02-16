import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const token = (name: string) => ({ opacityValue }: { opacityValue?: string }) =>
  opacityValue === undefined
    ? `oklch(var(${name}))`
    : `oklch(var(${name}) / ${opacityValue})`;

const varColor = (name: string) => `var(${name})`;

export default {
  darkMode: ['class'],
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: token('--border'),
        input: token('--input'),
        ring: token('--ring'),
        background: token('--background'),
        foreground: token('--foreground'),

        primary: {
          DEFAULT: token('--primary'),
          foreground: token('--primary-foreground'),
          50: varColor('--primary-50'),
          100: varColor('--primary-100'),
          200: varColor('--primary-200'),
          300: varColor('--primary-300'),
          400: varColor('--primary-400'),
          500: varColor('--primary-500'),
          600: varColor('--primary-600'),
          700: varColor('--primary-700'),
          800: varColor('--primary-800'),
          900: varColor('--primary-900'),
        },
        secondary: {
          DEFAULT: token('--secondary'),
          foreground: token('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: token('--destructive'),
          foreground: token('--destructive-foreground'),
        },
        muted: {
          DEFAULT: token('--muted'),
          foreground: token('--muted-foreground'),
        },
        accent: {
          DEFAULT: token('--accent'),
          foreground: token('--accent-foreground'),
          50: varColor('--accent-50'),
          100: varColor('--accent-100'),
          200: varColor('--accent-200'),
          300: varColor('--accent-300'),
          400: varColor('--accent-400'),
          500: varColor('--accent-500'),
          600: varColor('--accent-600'),
          700: varColor('--accent-700'),
          800: varColor('--accent-800'),
          900: varColor('--accent-900'),
        },
        popover: {
          DEFAULT: token('--popover'),
          foreground: token('--popover-foreground'),
        },
        card: {
          DEFAULT: token('--card'),
          foreground: token('--card-foreground'),
        },

        success: {
          DEFAULT: token('--success'),
          foreground: token('--success-foreground'),
        },
        warning: {
          DEFAULT: token('--warning'),
          foreground: token('--warning-foreground'),
        },
        info: {
          DEFAULT: token('--info'),
          foreground: token('--info-foreground'),
        },

        brand: {
          50: varColor('--brand-50'),
          100: varColor('--brand-100'),
          200: varColor('--brand-200'),
          300: varColor('--brand-300'),
          400: varColor('--brand-400'),
          500: varColor('--brand-500'),
          600: varColor('--brand-600'),
          700: varColor('--brand-700'),
          800: varColor('--brand-800'),
          900: varColor('--brand-900'),
        },
        neutral: {
          50: varColor('--neutral-50'),
          100: varColor('--neutral-100'),
          200: varColor('--neutral-200'),
          300: varColor('--neutral-300'),
          400: varColor('--neutral-400'),
          500: varColor('--neutral-500'),
          600: varColor('--neutral-600'),
          700: varColor('--neutral-700'),
          800: varColor('--neutral-800'),
          900: varColor('--neutral-900'),
        },

        chart: {
          1: varColor('--chart-1'),
          2: varColor('--chart-2'),
          3: varColor('--chart-3'),
          4: varColor('--chart-4'),
          5: varColor('--chart-5'),
        },

        sidebar: {
          DEFAULT: token('--sidebar-background'),
          foreground: token('--sidebar-foreground'),
          primary: token('--sidebar-primary'),
          'primary-foreground': token('--sidebar-primary-foreground'),
          accent: token('--sidebar-accent'),
          'accent-foreground': token('--sidebar-accent-foreground'),
          border: token('--sidebar-border'),
          ring: token('--sidebar-ring'),
        },

        severity: {
          light: token('--severity-light'),
          'light-foreground': varColor('--severity-light-foreground'),
          'light-bg': varColor('--severity-light-bg'),
          intermediate: token('--severity-intermediate'),
          'intermediate-foreground': varColor('--severity-intermediate-foreground'),
          'intermediate-bg': varColor('--severity-intermediate-bg'),
          serious: token('--severity-serious'),
          'serious-foreground': varColor('--severity-serious-foreground'),
          'serious-bg': varColor('--severity-serious-bg'),
          critical: token('--severity-critical'),
          'critical-foreground': varColor('--severity-critical-foreground'),
          'critical-bg': varColor('--severity-critical-bg'),
        },

        status: {
          open: token('--status-open'),
          analysis: token('--status-analysis'),
          resolved: token('--status-resolved'),
          closed: token('--status-closed'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
