import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		react(),
		...(mode === 'analyze'
			? [
					visualizer({
						filename: 'dist/stats.html',
						open: true,
						gzipSize: true,
						brotliSize: true,
						template: 'treemap',
					}),
			  ]
			: []),
	],
	resolve: {
		alias: {
			'@lib': path.resolve(__dirname, 'src/lib'),
			'@app': path.resolve(__dirname, 'src/app'),
			'@features': path.resolve(__dirname, 'src/features'),
			'@shared': path.resolve(__dirname, 'src/shared'),
			'@assets': path.resolve(__dirname, 'src/assets'),
		},
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {},
		},
		// Eliminar console.log en builds (producción)
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
	},
	// Definir variables de entorno para el cliente
	define: {
		__DEV__: mode === 'development',
	},
}))
