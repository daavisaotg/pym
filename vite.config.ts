import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages não conhece as rotas do React. Copiar o index.html para 404.html
 * faz qualquer link direto (ex.: /database/peter-parker) abrir o app normalmente.
 */
function githubPagesFallback(): Plugin {
  return {
    name: 'pym:github-pages-fallback',
    apply: 'build',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const index = resolve(dist, 'index.html');
      if (existsSync(index)) copyFileSync(index, resolve(dist, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Repositório de projeto (usuario.github.io/nome-do-repo) → VITE_BASE=/nome-do-repo/
    // Domínio próprio ou usuario.github.io → VITE_BASE=/
    base: env.VITE_BASE || '/',
    plugins: [react(), githubPagesFallback()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
