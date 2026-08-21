import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative Pfade: funktioniert lokal und unter dem Unterpfad von GitHub Pages
  // (https://<user>.github.io/timetable-creator/) ohne weitere Konfiguration.
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
