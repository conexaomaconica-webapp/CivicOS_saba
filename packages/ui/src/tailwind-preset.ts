/**
 * Shared Tailwind mapping for the White Label Core. Applications provide only
 * their content globs and plugins; semantic color names stay identical across
 * every product.
 */
export const WHITE_LABEL_TAILWIND_PRESET = {
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        'semantic-accent': {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
          subtle: 'var(--color-accent-subtle)',
          'subtle-foreground': 'var(--color-accent-subtle-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          foreground: 'var(--color-warning-foreground)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          foreground: 'var(--color-info-foreground)',
        },
        ring: 'var(--color-ring)',
        overlay: 'var(--color-overlay)',
        border: {
          DEFAULT: 'var(--color-border)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },

        // Temporary compatibility utilities for existing consumers.
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        highlight: {
          DEFAULT: 'var(--highlight)',
          hover: 'var(--highlight-hover)',
          active: 'var(--highlight-active)',
          subtle: 'var(--highlight-subtle)',
        },
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        interface: 'var(--font-interface)',
      },
      boxShadow: {
        semanticSm: 'var(--shadow-sm)',
        semanticMd: 'var(--shadow-md)',
      },
    },
  },
};

