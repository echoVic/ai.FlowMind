
    import type { Config } from 'tailwindcss';
    
      import { nextui } from '@nextui-org/react';
      

    export default {
      content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,jsx,ts,tsx}',
        './node_modules/@nextui-org/theme/dist/components/**/*.js',
      ],
      darkMode: 'class',
      plugins: [
        nextui()
      ],
    } satisfies Config;
  