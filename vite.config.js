import { defineConfig } from "vite";

// GitHub Pages serve o site em /miguel-goal-detector/, não na raiz do
// domínio — só a build de produção (o "npm run dev" local continua na raiz).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/miguel-goal-detector/" : "/",
}));
