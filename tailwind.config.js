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
        'v-bg': 'rgb(var(--v-bg-rgb) / <alpha-value>)',
        'v-surface': 'rgb(var(--v-surface-rgb) / <alpha-value>)',
        'v-surface-2': 'rgb(var(--v-surface-2-rgb) / <alpha-value>)',
        'v-line': 'rgb(var(--v-line-rgb) / <alpha-value>)',
        'v-ink': 'rgb(var(--v-ink-rgb) / <alpha-value>)',
        'v-muted': 'rgb(var(--v-muted-rgb) / <alpha-value>)',
        'v-brand': 'rgb(var(--v-brand-rgb) / <alpha-value>)',
        'v-brand-hover': 'rgb(var(--v-brand-hover-rgb) / <alpha-value>)',
        'v-brand-soft': 'rgb(var(--v-brand-soft-rgb) / <alpha-value>)',
        'v-plum': 'rgb(var(--v-plum-rgb) / <alpha-value>)',
        'v-champagne': 'rgb(var(--v-champagne-rgb) / <alpha-value>)',
        'v-champagne-ink': 'rgb(var(--v-champagne-ink-rgb) / <alpha-value>)',
        'v-champagne-light': 'rgb(var(--v-champagne-light-rgb) / <alpha-value>)',
        'v-obsidian': 'rgb(var(--v-obsidian-rgb) / <alpha-value>)',
        'v-platinum': 'rgb(var(--v-platinum-rgb) / <alpha-value>)',
        'v-ok': 'rgb(var(--v-ok-rgb) / <alpha-value>)',
        'v-warn': 'rgb(var(--v-warn-rgb) / <alpha-value>)',
        'v-danger': 'rgb(var(--v-danger-rgb) / <alpha-value>)',

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
        // Identidad VANESEV (G-039): Bodoni Moda en titulares y Jost en texto; nada de Cormorant (es la de DKitchen).
        lujo: ['"Bodoni Moda"', 'Didot', 'Georgia', 'serif'],
        texto: ['Jost', '"Helvetica Neue"', 'Arial', 'sans-serif'],
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
