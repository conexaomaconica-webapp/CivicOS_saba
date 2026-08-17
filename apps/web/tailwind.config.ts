import type { Config } from 'tailwindcss'
import { WHITE_LABEL_TAILWIND_PRESET } from '@saas/ui/tailwind-preset'

export default {
  presets: [WHITE_LABEL_TAILWIND_PRESET],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../plugins/*/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [],
} satisfies Config;
