import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';

const external = ['react', 'react-dom'];
const relayExternal = [...external, 'recoil', 'react-relay', 'relay-runtime'];
const syncExternal = [...external, 'recoil', 'transit-js', '@recoiljs/refine'];
const refineExternal = [];

const commonPlugins = [
    nodeResolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        preferBuiltins: false,
    }),
    commonjs(),
];

// Main Recoil build configuration
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

// Main Recoil TypeScript declarations build
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

// Recoil-Relay build configuration
const relayBuild = {
    input: 'packages/recoil-relay/src/index.ts',
    output: [
        {
            file: 'packages/recoil-relay/dist/index.mjs',
            format: 'es',
        },
        {
            file: 'packages/recoil-relay/dist/index.cjs',
            format: 'cjs',
        },
    ],
    external: relayExternal,
    plugins: [
        ...commonPlugins,
        typescript({
            tsconfig: './tsconfig.json',
            declaration: false,
            include: ['packages/recoil-relay/src/**/*', 'packages/shared/src/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
            compilerOptions: {
                outDir: 'packages/recoil-relay/dist',
                rootDir: '.',
            },
        }),
    ],
};

// Recoil-Relay TypeScript declarations build
const relayDtsBuild = {
    input: 'packages/recoil-relay/src/index.ts',
    output: [
        {
            file: 'packages/recoil-relay/dist/index.d.ts',
            format: 'es',
        },
        {
            file: 'packages/recoil-relay/dist/index.d.cts',
            format: 'cjs',
        },
    ],
    external: relayExternal,
    plugins: [
        dts({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                outDir: 'packages/recoil-relay/dist',
                rootDir: '.',
            },
        }),
    ],
};

// Recoil-Sync build configuration
const syncBuild = {
    input: 'packages/recoil-sync/src/index.ts',
    output: [
        {
            file: 'packages/recoil-sync/dist/index.mjs',
            format: 'es',
        },
        {
            file: 'packages/recoil-sync/dist/index.cjs',
            format: 'cjs',
        },
    ],
    external: syncExternal,
    plugins: [
        ...commonPlugins,
        typescript({
            tsconfig: './tsconfig.json',
            declaration: false,
            include: ['packages/recoil-sync/src/**/*', 'packages/shared/src/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
            compilerOptions: {
                outDir: 'packages/recoil-sync/dist',
                rootDir: '.',
            },
        }),
    ],
};

// Recoil-Sync TypeScript declarations build
const syncDtsBuild = {
    input: 'packages/recoil-sync/src/index.ts',
    output: [
        {
            file: 'packages/recoil-sync/dist/index.d.ts',
            format: 'es',
        },
        {
            file: 'packages/recoil-sync/dist/index.d.cts',
            format: 'cjs',
        },
    ],
    external: syncExternal,
    plugins: [
        dts({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                outDir: 'packages/recoil-sync/dist',
                rootDir: '.',
            },
        }),
    ],
};

// Refine build configuration
const refineBuild = {
    input: 'packages/refine/src/index.ts',
    output: [
        {
            file: 'packages/refine/dist/index.mjs',
            format: 'es',
        },
        {
            file: 'packages/refine/dist/index.cjs',
            format: 'cjs',
        },
    ],
    external: refineExternal,
    plugins: [
        ...commonPlugins,
        typescript({
            tsconfig: 'packages/refine/tsconfig.json',
            declaration: false,
        }),
    ],
};

// Refine TypeScript declarations build
const refineDtsBuild = {
    input: 'packages/refine/src/index.ts',
    output: [
        {
            file: 'packages/refine/dist/index.d.ts',
            format: 'es',
        },
        {
            file: 'packages/refine/dist/index.d.cts',
            format: 'cjs',
        },
    ],
    external: refineExternal,
    plugins: [
        dts({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                outDir: 'packages/refine/dist',
                rootDir: '.',
            },
        }),
    ],
};

export default [mainBuild, dtsBuild, relayBuild, relayDtsBuild, syncBuild, syncDtsBuild, refineBuild, refineDtsBuild]; 