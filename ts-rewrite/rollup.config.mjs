import typescript from '@rollup/plugin-typescript';
import pkg from '@rollup/plugin-node-resolve';
const { nodeResolve } = pkg;
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: true,
        },
        {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
    ],
    plugins: [
        nodeResolve({ extensions: ['.js', '.ts', '.tsx'] }),
        commonjs(),
        typescript({ tsconfig: './tsconfig.json' }),
        terser(),
    ],
    external: ['react'],
}; 