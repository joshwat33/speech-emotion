// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Import the vite plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),        // Include the React plugin
    tailwindcss(),  // Include the Tailwind CSS Vite plugin
  ],
  // Optional: Configure the dev server port if needed
  // server: {
  //   port: 5173,
  // }
})