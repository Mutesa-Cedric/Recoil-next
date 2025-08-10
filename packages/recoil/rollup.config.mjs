import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';

const external = ['react', 'react-dom', 'react/jsx-runtime'];

const commonPlugins = [
    nodeResolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        preferBuiltins: false,
    }),
    commonjs(),
];

// Main Recoil build configuration
const mainBuild = {
    input: 'src/index.ts',
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
            tsconfig: '../../tsconfig.json',
            declaration: false,
            include: ['src/**/*', '../shared/src/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
            compilerOptions: {
                outDir: undefined,
            },
        }),
    ],
};

// Main Recoil TypeScript declarations build
const dtsBuild = {
    input: 'src/index.ts',
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
            tsconfig: '../../tsconfig.json',
        }),
    ],
};

export default [mainBuild, dtsBuild]; 