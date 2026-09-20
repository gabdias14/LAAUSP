/* Leitura dos códigos do e-Card USP e da carteirinha da LAAUSP.

   O e-Card aparece de duas formas: no aplicativo da USP, como QR Code, e na
   Apple Wallet, como código de barras. Por isso, quando o navegador tem a API
   BarcodeDetector, pedimos todos os formatos que ele suportar. Sem ela, o jsQR
   (assets/vendor/jsQR.js) cobre só o QR — é o caso do Safari/iOS. */

const FORMATOS_DESEJADOS = [
  "qr_code", "code_128", "code_39", "code_93", "codabar",
  "ean_13", "ean_8", "itf", "upc_a", "upc_e", "pdf417", "data_matrix",
];

let detectorNativo = null;

async function obterDetectorNativo() {
  if (detectorNativo !== null) return detectorNativo;
  try {
    if (!("BarcodeDetector" in window)) return (detectorNativo = false);
    const suportados = await window.BarcodeDetector.getSupportedFormats();
    const formatos = FORMATOS_DESEJADOS.filter((f) => suportados.includes(f));
    detectorNativo = formatos.length ? new window.BarcodeDetector({ formats }) : false;
  } catch {
    detectorNativo = false;
  }
  return detectorNativo;
}

/** Diz o que o leitor deste navegador consegue ler, para avisar o operador. */
export async function formatosSuportados() {
  const nativo = await obterDetectorNativo();
  if (!nativo) return FORMATOS_DESEJADOS;
  const suportados = await window.BarcodeDetector.getSupportedFormats();
  return FORMATOS_DESEJADOS.filter((f) => suportados.includes(f));
}

async function carregarScript(src, global) {
  if (window[global]) return window[global];
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Não foi possível carregar ${src}.`));
    document.head.append(script);
  });
  return window[global];
}

/** Leitor multiformato em JS puro, usado onde não há BarcodeDetector (iOS). */
let leitorZXing = null;

/** Versão em preto e branco puro do quadro.

   O e-Card na Wallet aparece como barras escuras dentro de uma caixa branca
   sobre o laranja da USP; nessa mistura o binarizador do ZXing erra, e o código
   só é lido depois de achatar a imagem em dois tons. */
function binarizar(canvas, limiar) {
  const copia = document.createElement("canvas");
  copia.width = canvas.width;
  copia.height = canvas.height;
  const contexto = copia.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(canvas, 0, 0);
  const imagem = contexto.getImageData(0, 0, copia.width, copia.height);
  const dados = imagem.data;
  for (let i = 0; i < dados.length; i += 4) {
    const luz = 0.299 * dados[i] + 0.587 * dados[i + 1] + 0.114 * dados[i + 2];
    const tom = luz < limiar ? 0 : 255;
    dados[i] = tom;
    dados[i + 1] = tom;
    dados[i + 2] = tom;
  }
  contexto.putImageData(imagem, 0, 0);
  return copia;
}

async function lerComZXing(canvas) {
  const ZXing = await carregarScript("assets/vendor/zxing.js", "ZXing");
  if (!leitorZXing) {
    const dicas = new Map();
    dicas.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.QR_CODE,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.CODE_93,
      ZXing.BarcodeFormat.CODABAR,
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.ITF,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.PDF_417,
      ZXing.BarcodeFormat.DATA_MATRIX,
    ]);
    dicas.set(ZXing.DecodeHintType.TRY_HARDER, true);
    leitorZXing = new ZXing.MultiFormatReader();
    leitorZXing.setHints(dicas);
  }

  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
  const luminancia = new ZXing.RGBLuminanceSource(
    Int32Array.from(new Uint32Array(imagem.data.buffer)), canvas.width, canvas.height);
  const binario = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminancia));
  try {
    const achado = leitorZXing.decode(binario);
    return {
      valor: achado.getText(),
      formato: String(ZXing.BarcodeFormat[achado.getBarcodeFormat()]).toLowerCase(),
    };
  } catch {
    return null;
  } finally {
    leitorZXing.reset();
  }
}

async function carregarJsQR() {
  return carregarScript("assets/vendor/jsQR.js", "jsQR");
}

/** Recorta o centro do quadro, para o código ocupar mais da imagem.

   Com o cartão inteiro enquadrado, o código de barras fica pequeno demais e o
   leitor não o encontra; aproximando o centro, ele aparece. */
function aproximar(canvas, fracao) {
  if (fracao >= 1) return canvas;
  const largura = Math.round(canvas.width * fracao);
  const altura = Math.round(canvas.height * fracao);
  const recorte = document.createElement("canvas");
  recorte.width = largura;
  recorte.height = altura;
  recorte.getContext("2d").drawImage(
    canvas,
    Math.round((canvas.width - largura) / 2), Math.round((canvas.height - altura) / 2),
    largura, altura, 0, 0, largura, altura);
  return recorte;
}

/** Lê um código de qualquer fonte desenhável (vídeo, imagem, canvas).
    Devolve { valor, formato } ou null.
    `intenso` tenta mais recortes e limiares — use em foto, não no vídeo. */
export async function lerCodigo(fonte, largura, altura, { intenso = false } = {}) {
  const nativo = await obterDetectorNativo();
  if (nativo) {
    const encontrados = await nativo.detect(fonte);
    if (!encontrados.length) return null;
    return { valor: encontrados[0].rawValue, formato: encontrados[0].format };
  }
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(fonte, 0, 0, largura, altura);

  // O jsQR é rápido e resolve o caso comum, o QR do aplicativo da USP.
  const jsQR = await carregarJsQR();
  const imagem = contexto.getImageData(0, 0, largura, altura);
  const achado = jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: "attemptBoth" });
  if (achado) return { valor: achado.data, formato: "qr_code" };

  // Sem QR na imagem, tenta os códigos de barras — é o e-Card na Apple Wallet.
  const aproximacoes = intenso ? [1, 0.66, 0.45, 0.3] : [1, 0.6];
  const limiares = intenso ? [null, 110, 160] : [null, 110];
  for (const fracao of aproximacoes) {
    const recorte = aproximar(canvas, fracao);
    for (const limiar of limiares) {
      const alvo = limiar === null ? recorte : binarizar(recorte, limiar);
      const achadoZXing = await lerComZXing(alvo);
      if (achadoZXing) return achadoZXing;
    }
  }
  return null;
}

export async function lerCodigoDeArquivo(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode();
    // Reduz fotos muito grandes: o jsQR fica lento acima de ~1600px.
    const escala = Math.min(1, 1600 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    return await lerCodigo(imagem,
      Math.round(imagem.naturalWidth * escala),
      Math.round(imagem.naturalHeight * escala),
      { intenso: true });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Interpreta o payload do QR do e-Card USP.

   No e-Card atual o QR carrega apenas um código numérico do cartão (10 dígitos),
   que NÃO é o número USP. Por isso devolvemos os dois campos separados: o código
   do cartão (sempre) e o número USP (só quando ele vem explícito no payload).
   O vínculo código ↔ número USP é montado no cadastro da área restrita. */
export function interpretarECard(payload) {
  const texto = (payload || "").trim();
  const resultado = { codigo: "", nusp: "", tipo: "ecard", idAtleta: "" };
  if (!texto) return resultado;

  // Carteirinha digital da LAAUSP: LAAUSP|<temporada>|<id do atleta>
  const carteirinha = /^LAAUSP\|(\d{4})\|(.+)$/i.exec(texto);
  if (carteirinha) {
    resultado.tipo = "carteirinha";
    resultado.temporada = carteirinha[1];
    resultado.idAtleta = carteirinha[2].trim();
    if (/^\d{4,12}$/.test(resultado.idAtleta)) resultado.nusp = resultado.idAtleta;
    return resultado;
  }

  const chavesUSP = ["codpes", "nusp", "numusp", "n_usp", "matricula"];
  try {
    const url = new URL(texto);
    for (const [chave, valor] of url.searchParams) {
      const limpa = chave.toLowerCase().replace(/[^a-z_]/g, "");
      if (!/^\d{4,12}$/.test(valor)) continue;
      if (chavesUSP.includes(limpa)) resultado.nusp = valor;
      else if (!resultado.codigo) resultado.codigo = valor;
    }
    if (!resultado.codigo) resultado.codigo = resultado.nusp || texto;
    return resultado;
  } catch {
    /* payload não é URL — segue para as heurísticas de texto */
  }

  const rotulado = /(?:codpes|nusp|n[ºo.]?\s*usp|matricula)\D{0,3}(\d{4,12})/i.exec(texto);
  if (rotulado) resultado.nusp = rotulado[1];

  const somenteDigitos = texto.replace(/\D/g, "");
  if (/^\d+$/.test(texto)) {
    resultado.codigo = texto;
    // Números curtos o bastante para serem um NUSP são aceitos como tal.
    if (texto.length <= 9 && !resultado.nusp) resultado.nusp = texto;
  } else {
    resultado.codigo = somenteDigitos || texto;
  }
  return resultado;
}
