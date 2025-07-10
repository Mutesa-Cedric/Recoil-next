import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'packages/recoil/src/index.ts',
    output: [
        {
            file: 'dist/index.esm.js',
            format: 'es',
            sourcemap: true,
        },
        {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: true,
        },
    ],
    external: ['react', 'react-dom'],
    plugins: [
        nodeResolve({
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            preferBuiltins: false,
        }),
        typescript({
            tsconfig: './tsconfig.json',
            declaration: true,
            declarationDir: './dist',
            include: ['packages/**/*'],
            exclude: ['**/__tests__/**', '**/*.test.*'],
        }),
        commonjs(),
    ],
}; 