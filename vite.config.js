import { defineConfig } from "vite";

// GitHub Pages serve o site em /miguel-goal-detector/, não na raiz do
// domínio — só a build de produção (o "npm run dev" local continua na raiz).
// Duas páginas: o app principal e uma telinha separada só pra comparar o
// modelo treinado no Teachable Machine (não faz parte do app de verdade).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/miguel-goal-detector/" : "/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        tmTest: "tm-test.html",
      },
    },
  },
}));
