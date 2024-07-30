import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    root: 'src',
    build: {
        outDir: '../../dist/',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                connect: resolve(__dirname, 'src/connect.html'),
                permission: resolve(__dirname, 'src/permission.html'),
            }
        }
    }
})