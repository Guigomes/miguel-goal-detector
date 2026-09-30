// Entrega 1: acha a bexiga num frame e nomeia sua cor, sem saber de
// antemão qual cor vai aparecer. A ideia não é reconhecer "bexiga" por
// forma treinada — é procurar um blob saturado e arredondado, do jeito
// que uma bexiga cheia de ar sempre aparece contra o sofá/chão/parede.

const MIN_AREA_FRACTION = 0.0015; // blob pequeno demais = ruído
const MAX_AREA_FRACTION = 0.35; // blob grande demais = provavelmente fundo
const MIN_CIRCULARITY = 0.55; // 1.0 = círculo perfeito
const MIN_SATURATION = 80; // 0-255, exclui cinza/madeira/parede
const MIN_VALUE = 40; // exclui sombras muito escuras
const MAX_VALUE = 250; // exclui estouro de brilho (reflexo direto de luz)

// Faixas de matiz (escala 0-180 do OpenCV) -> nome de cor em pt-BR.
const HUE_NAMES = [
  { max: 10, name: "vermelho" },
  { max: 22, name: "laranja" },
  { max: 34, name: "amarelo" },
  { max: 85, name: "verde" },
  { max: 100, name: "ciano" },
  { max: 130, name: "azul" },
  { max: 150, name: "roxo" },
  { max: 170, name: "rosa" },
  { max: 180, name: "vermelho" },
];

function nameForHsv(hue, sat, val) {
  if (val < 60) return "preto";
  if (sat < 40) return val > 200 ? "branco" : "cinza";
  const hit = HUE_NAMES.find((band) => hue <= band.max);
  return hit ? hit.name : "indefinida";
}

// Tons de pele caem numa faixa de matiz parecida com laranja/vermelho,
// mas com saturação mais moderada e menos uniforme que uma bexiga cheia
// de ar (que costuma ser bem saturada e mais "lisa"). Isso não é perfeito,
// mas evita boa parte dos falsos positivos com mão/rosto no quadro.
function looksLikeSkin(hue, sat) {
  return hue >= 3 && hue <= 20 && sat >= 40 && sat <= 150;
}

/**
 * @param {*} cv instância do OpenCV.js já carregada
 * @param {*} rgba cv.Mat RGBA (ex: de cv.matFromImageData)
 * @returns {{cx:number, cy:number, radius:number, colorName:string, points:{x:number,y:number}[]}|null}
 */
export function detectBalloon(cv, rgba) {
  const frameArea = rgba.rows * rgba.cols;

  const rgb = new cv.Mat();
  const hsv = new cv.Mat();
  const mask = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let low;
  let high;

  try {
    cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);

    low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, MIN_SATURATION, MIN_VALUE, 0]);
    high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, MAX_VALUE, 255]);
    cv.inRange(hsv, low, high, mask);

    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);

    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best = null;
    let bestScore = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const areaFraction = area / frameArea;

      if (areaFraction >= MIN_AREA_FRACTION && areaFraction <= MAX_AREA_FRACTION) {
        const circle = cv.minEnclosingCircle(contour);
        const circleArea = Math.PI * circle.radius * circle.radius;
        const circularity = circleArea > 0 ? area / circleArea : 0;

        if (circularity >= MIN_CIRCULARITY && area > bestScore) {
          best = { contour, circle, circularity };
          bestScore = area;
        }
      }

      if (best?.contour !== contour) contour.delete();
    }

    if (!best) return null;

    // Cor média só dentro do contorno vencedor (não do frame inteiro).
    const single = new cv.MatVector();
    single.push_back(best.contour);
    const contourMask = cv.Mat.zeros(hsv.rows, hsv.cols, cv.CV_8UC1);
    cv.drawContours(contourMask, single, 0, new cv.Scalar(255), -1);
    const meanHsv = cv.mean(hsv, contourMask);
    contourMask.delete();
    single.delete();

    const [hue, sat, val] = meanHsv;
    const colorName = looksLikeSkin(hue, sat) ? "pele (ignorado)" : nameForHsv(hue, sat, val);

    const points = [];
    for (let j = 0; j < best.contour.rows; j++) {
      points.push({ x: best.contour.data32S[j * 2], y: best.contour.data32S[j * 2 + 1] });
    }

    const result =
      colorName === "pele (ignorado)"
        ? null
        : {
            cx: best.circle.center.x,
            cy: best.circle.center.y,
            radius: best.circle.radius,
            colorName,
            points,
          };

    best.contour.delete();
    return result;
  } finally {
    rgb.delete();
    hsv.delete();
    mask.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    low?.delete();
    high?.delete();
  }
}
