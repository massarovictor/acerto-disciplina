import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const token = (name: string) => ({ opacityValue }: { opacityValue?: string }) =>
  opacityValue === undefined
    ? `rgb(var(${name}))`
    : `rgb(var(${name}) / ${opacityValue})`;

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
        border: token('--border-rgb'),
        input: token('--input-rgb'),
        ring: token('--ring-rgb'),
        background: token('--background-rgb'),
        foreground: token('--foreground-rgb'),

        primary: {
          DEFAULT: token('--primary-rgb'),
          foreground: token('--primary-foreground-rgb'),
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
          DEFAULT: token('--secondary-rgb'),
          foreground: token('--secondary-foreground-rgb'),
        },
        destructive: {
          DEFAULT: token('--destructive-rgb'),
          foreground: token('--destructive-foreground-rgb'),
        },
        muted: {
          DEFAULT: token('--muted-rgb'),
          foreground: token('--muted-foreground-rgb'),
        },
        accent: {
          DEFAULT: token('--accent-rgb'),
          foreground: token('--accent-foreground-rgb'),
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
          DEFAULT: token('--popover-rgb'),
          foreground: token('--popover-foreground-rgb'),
        },
        card: {
          DEFAULT: token('--card-rgb'),
          foreground: token('--card-foreground-rgb'),
        },

        success: {
          DEFAULT: token('--success-rgb'),
          foreground: token('--success-foreground-rgb'),
        },
        warning: {
          DEFAULT: token('--warning-rgb'),
          foreground: token('--warning-foreground-rgb'),
        },
        info: {
          DEFAULT: token('--info-rgb'),
          foreground: token('--info-foreground-rgb'),
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
          DEFAULT: token('--sidebar-background-rgb'),
          foreground: token('--sidebar-foreground-rgb'),
          primary: token('--sidebar-primary-rgb'),
          'primary-foreground': token('--sidebar-primary-foreground-rgb'),
          accent: token('--sidebar-accent-rgb'),
          'accent-foreground': token('--sidebar-accent-foreground-rgb'),
          border: token('--sidebar-border-rgb'),
          ring: token('--sidebar-ring-rgb'),
        },

        severity: {
          light: token('--severity-light-rgb'),
          'light-foreground': varColor('--severity-light-foreground'),
          'light-bg': varColor('--severity-light-bg'),
          intermediate: token('--severity-intermediate-rgb'),
          'intermediate-foreground': varColor('--severity-intermediate-foreground'),
          'intermediate-bg': varColor('--severity-intermediate-bg'),
          serious: token('--severity-serious-rgb'),
          'serious-foreground': varColor('--severity-serious-foreground'),
          'serious-bg': varColor('--severity-serious-bg'),
          critical: token('--severity-critical-rgb'),
          'critical-foreground': varColor('--severity-critical-foreground'),
          'critical-bg': varColor('--severity-critical-bg'),
        },

        status: {
          open: token('--status-open-rgb'),
          analysis: token('--status-analysis-rgb'),
          resolved: token('--status-resolved-rgb'),
          closed: token('--status-closed-rgb'),
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
