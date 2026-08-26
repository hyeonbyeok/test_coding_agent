import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tiles': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, ''),
      },
      '/api': {
        // 8080 은 이 개발 PC 에서 무관한 프로세스가 이미 점유 중이라 로컬 Tomcat 은 8082 로 띄웠다 (tomcat/README 참고)
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})
