# Miguel Goal Detector

App de brincadeira: jogamos "gol" com uma bexiga no sofá de casa, filmando
com o celular, e o app diz se foi gol ou não — ao vivo, direto no
navegador (sem instalar nada, sem backend).

Visão computacional roda inteira no dispositivo via
[OpenCV.js](https://github.com/TechStark/opencv-js). Sem TensorFlow/redes
treinadas: a bexiga é achada por cor+forma (segmentação HSV + circularidade),
não por classificação — não existe um "detector de bexiga" pronto por aí,
e treinar um do zero seria trabalho sem necessidade pra esse caso.

## Entregas

1. **Detectar a bexiga e sua cor** (`src/balloon-detector.js`) — qualquer
   cor, sem calibração prévia. *(em andamento)*
2. **Reconhecer o sofá específico de casa** — calibração por foto de
   referência (marcar o contorno na própria foto), depois feature
   matching + homografia pra achar o mesmo sofá em cada sessão.
3. **Áreas de gol** — marcar sub-áreas do sofá na calibração e decidir,
   frame a frame, se a bexiga entrou totalmente numa delas.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. No notebook, o botão "Ligar câmera" usa a
webcam — serve pra validar a lógica rápido sem precisar do celular.

### Testando sem câmera

Use "Carregar vídeo de teste" pra rodar a detecção em cima de um vídeo já
gravado (arquivo local, processado com o mesmo pipeline da câmera ao
vivo). Grave uns clipes curtos jogando com o Miguel — cores de bexiga
diferentes, mão/rosto no quadro, bexiga parada e em movimento — e guarde
em `test-videos/` (a pasta é ignorada pelo git de propósito: são vídeos de
casa, não fazem sentido versionados).

### Testando no celular

`getUserMedia` exige contexto seguro (HTTPS), então testar a câmera ao
vivo no celular direto do `npm run dev` local não funciona. Todo push em
`main` publica automaticamente no GitHub Pages (`.github/workflows/deploy.yml`):

**https://guigomes.github.io/miguel-goal-detector/**

Abre esse link no navegador do celular e toca em "Ligar câmera".

## Stack

- [Vite](https://vitejs.dev/) — dev server e build, sem framework de UI
  (a superfície de tela é pequena).
- [`@techstark/opencv-js`](https://github.com/TechStark/opencv-js) —
  OpenCV compilado pra WebAssembly, roda no navegador.
- Sem backend: tudo processado no cliente, nada sobe pra lugar nenhum.
