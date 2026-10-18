import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/recorder/index.js',
  output: {
    file: 'public/recorder.js',
    format: 'iife',
  },
  plugins: [resolve({ browser: true }), commonjs(), terser({ compress: { evaluate: false } })],
};
