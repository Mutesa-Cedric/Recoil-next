import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';

const external = ['react', 'react-dom'];

const commonPlugins = [
    nodeResolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        preferBuiltins: false,
    }),
    commonjs(),
];

// Main build configuration
const mainBuild = {
    input: 'packages/recoil/src/index.ts',
    output: [
        {
            file: 'dist/index.mjs',
            format: 'es',
        },
        {
            file: 'dist/index.cjs',
            format: 'cjs',
        },
    ],
    external,
    plugins: [
        ...commonPlugins,
        typescript({
            tsconfig: './tsconfig.json',
            declaration: false, // We'll handle declarations separately
            include: ['packages/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
        }),
    ],
};

// TypeScript declarations build
const dtsBuild = {
    input: 'packages/recoil/src/index.ts',
    output: [
        {
            file: 'dist/index.d.ts',
            format: 'es',
        },
        {
            file: 'dist/index.d.cts',
            format: 'cjs',
        },
    ],
    external,
    plugins: [
        dts({
            tsconfig: './tsconfig.json',
        }),
    ],
};

export default [mainBuild, dtsBuild]; 