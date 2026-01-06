import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({   
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    port: 4000, // <-- set your desired port here
    proxy: {
        "/api" : {
            target: "https://localhost:3000",
            secure: false,
            changeOrigin: true,
        }
    }
  }
})
