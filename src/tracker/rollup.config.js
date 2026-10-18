import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/tracker/index.ts',
  output: {
    file: 'public/script.js',
    format: 'iife',
  },
  plugins: [
    typescript({ tsconfig: 'src/tracker/tsconfig.json' }),
    terser({ compress: { evaluate: false } }),
  ],
};
