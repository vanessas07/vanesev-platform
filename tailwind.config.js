/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VANESEV Ciruela Imperial Official Design Tokens (docs/DISENO_AUTOR_VANESEV.md)
        'v-bg': 'var(--v-bg)',
        'v-surface': 'var(--v-surface)',
        'v-surface-2': 'var(--v-surface-2)',
        'v-line': 'var(--v-line)',
        'v-ink': 'var(--v-ink)',
        'v-muted': 'var(--v-muted)',
        'v-brand': 'var(--v-brand)',
        'v-brand-hover': 'var(--v-brand-hover)',
        'v-brand-soft': 'var(--v-brand-soft)',
        'v-platinum': 'var(--v-platinum)',
        'v-ok': 'var(--v-ok)',
        'v-warn': 'var(--v-warn)',
        'v-danger': 'var(--v-danger)',

        // VANESEV Luminous Luxury Beauty System (Silk Alabaster, Cashmere, Rose Quartz, Champagne, Espresso)
        seda: '#FAF7F2',
        perla: '#F4EFEA',
        cashmere: '#EFE6DF',
        espresso: '#1E181A',
        cacao: '#3D3135',
        taupe: '#6E5D62',
        bruma: '#9C8B90',
        borde: '#E6DAD2',
        'borde-fuerte': '#D5C3B8',
        rosa: '#B85D6F',
        'rosa-suave': '#F7E8EB',
        champagne: '#C89B7B',
        terracota: '#C96A52',
        esmeralda: '#227C5D',

        // Legacy tokens kept so existing components don't break
        noche: '#1E181A',
        obsidiana: '#292124',
        carbon: '#362C30',
        tinta: '#1E181A',
        grafito: '#4A3E42',
        niebla: '#6E5D62',
        ceniza: '#9C8B90',
        linea: '#E6DAD2',
        'linea-fuerte': '#D5C3B8',
        crema: '#FAF7F2',
        papel: '#F4EFEA',
        cassis: '#B85D6F',
        'cassis-hondo': '#964354',
        oro: '#C89B7B',
        exito: '#227C5D',

        // Scoped legacy tokens ONLY for external Andrea Labrador Nails client (/andrea-nails)
        sage: {
          50: '#f5f8f6',
          100: '#e5ece7',
          200: '#cbd8cf',
          300: '#a7beb0',
          400: '#7d988d',
          500: '#648577',
          600: '#4e6b5e',
          700: '#3f564c',
          800: '#34463e',
          900: '#2c3b35',
        },
        warm: {
          50: '#fdfcfb',
          100: '#fbf9f6',
          200: '#f5f0ea',
          300: '#eae3d8',
          800: '#232a26',
          900: '#181f1c',
        },
        gold: {
          400: '#e0c598',
          500: '#c5a880',
          600: '#a68a62',
        }
      },
      fontFamily: {
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        manrope: ['Manrope', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        vogue: ['Bodoni Moda', 'Georgia', 'serif'],
        andrea: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 8px 30px -4px rgba(30, 24, 26, 0.06)',
        'luxury': '0 24px 60px -12px rgba(30, 24, 26, 0.10)',
        'card': '0 10px 30px -5px rgba(30, 24, 26, 0.05)',
        'pill': '0 4px 20px -2px rgba(30, 24, 26, 0.07)',
      }
    },
  },
  plugins: [],
}
