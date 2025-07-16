import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';

const external = [
    'react', 
    'react-dom', 
    'recoil', 
    'react-relay', 
    'relay-runtime'
];

const commonPlugins = [
    nodeResolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        preferBuiltins: false,
    }),
    commonjs(),
];

// Main build configuration
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
            tsconfig: './tsconfig.json',
            declaration: true,
            declarationDir: './dist',
            include: ['src/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
        }),
    ],
};

export default mainBuild; 