import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";
import path from "path";

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
        port: 4000,
        host: true, // allows LAN access
        https: {
            key: fs.readFileSync(path.resolve(__dirname, "certs/localhost-key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "certs/localhost.pem")),
        },

      // Helps avoid HMR weirdness with HTTPS in some setups
      hmr: {
          protocol: "wss",
      },
      proxy: {
          "/api": {
              target: "https://localhost:3000",
              secure: false,
              changeOrigin: true,
          },
          "/profile-pics": {
              target: "https://localhost:3000",
              secure: false,
              changeOrigin: true,
          },
          "/documents": {
              target: "https://localhost:3000",
              secure: false,
              changeOrigin: true,
          },
          "/socket.io": {
              target: "https://localhost:3000",
              secure: false,
              changeOrigin: true,
              ws: true,
          },
      }

  }
})
