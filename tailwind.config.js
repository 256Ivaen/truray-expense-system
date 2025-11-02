/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: '#f1df23', 
        secondary: '#010928',
        
        'primary-scale': {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#f1df23', // Your primary color
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        
        'secondary-scale': {
          50: '#f0f4fd',
          100: '#dde6fa',
          200: '#c3d3f7',
          300: '#9ab6f2',
          400: '#6a92eb',
          500: '#476ee5',
          600: '#3452d9',
          700: '#2b41c7',
          800: '#2937a1',
          900: '#010928', // Your secondary color
          950: '#0a0f2d',
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        skeleton: "hsl(var(--skeleton))",
        border: "hsl(var(--btn-border))",
        input: "hsl(var(--input))",
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #fef08a 0%, #f1df23 50%, #713f12 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #fef08a 0%, #f1df23 100%)',
        'gradient-primary-dark': 'linear-gradient(135deg, #713f12 0%, #422006 100%)',
        'gradient-primary-reverse': 'linear-gradient(135deg, #713f12 0%, #f1df23 50%, #fef08a 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #3452d9 0%, #2937a1 50%, #010928 100%)',
        'gradient-secondary-soft': 'linear-gradient(135deg, #3452d9 0%, #2937a1 100%)',
      },
      animation: {
        'skew-scroll': 'skew-scroll 20s linear infinite',
        'ripple': 'ripple 2s ease calc(var(--i, 0) * 0.2s) infinite',
        'orbit': 'orbit calc(var(--duration) * 1s) linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      keyframes: {
        'skew-scroll': {
          '0%': {
            transform: 'rotateX(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(0)',
          },
          '100%': {
            transform: 'rotateX(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(-100%)',
          },
        },
        'ripple': {
          '0%, 100%': { 
            transform: 'translate(-50%, -50%) scale(1)' 
          },
          '50%': { 
            transform: 'translate(-50%, -50%) scale(0.9)' 
          },
        },
        'orbit': {
          '0%': {
            transform: 'rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)',
          },
        },
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        input: [
          "0px 2px 3px -1px rgba(0, 0, 0, 0.1)",
          "0px 1px 0px 0px rgba(25, 28, 33, 0.02)",
          "0px 0px 0px 1px rgba(25, 28, 33, 0.08)",
        ].join(", "),
      },
      gridTemplateColumns: {
        '10': 'repeat(10, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-7': 'span 7 / span 7',
        'span-3': 'span 3 / span 3',
      },
    },
  },
  plugins: [], // Removed @tailwindcss/forms
  variants: {
    extend: {
      backgroundColor: ['checked', 'hover', 'checked:hover'],
      borderColor: ['checked', 'hover', 'checked:hover'],
      textColor: ['checked', 'hover', 'checked:hover'],
    },
  }
}