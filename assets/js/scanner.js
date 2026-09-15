/* Leitura do QR Code do e-Card USP para a área do representante.

   Usa a API nativa BarcodeDetector quando disponível e cai para o jsQR
   (assets/vendor/jsQR.js) nos navegadores que não a implementam — incluindo
   Safari/iOS. Funciona com a câmera ao vivo e com fotos do e-Card. */

let detectorNativo = null;

async function obterDetectorNativo() {
  if (detectorNativo !== null) return detectorNativo;
  try {
    if (!("BarcodeDetector" in window)) return (detectorNativo = false);
    const formatos = await window.BarcodeDetector.getSupportedFormats();
    detectorNativo = formatos.includes("qr_code")
      ? new window.BarcodeDetector({ formats: ["qr_code"] })
      : false;
  } catch {
    detectorNativo = false;
  }
  return detectorNativo;
}

async function carregarJsQR() {
  if (window.jsQR) return window.jsQR;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "assets/vendor/jsQR.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Não foi possível carregar o leitor de QR."));
    document.head.append(script);
  });
  return window.jsQR;
}

/** Lê um QR de qualquer fonte desenhável (vídeo, imagem, canvas). */
export async function lerQR(fonte, largura, altura) {
  const nativo = await obterDetectorNativo();
  if (nativo) {
    const encontrados = await nativo.detect(fonte);
    if (encontrados.length) return encontrados[0].rawValue;
    return null;
  }
  const jsQR = await carregarJsQR();
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(fonte, 0, 0, largura, altura);
  const imagem = contexto.getImageData(0, 0, largura, altura);
  const achado = jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: "attemptBoth" });
  return achado ? achado.data : null;
}

export async function lerQRDeArquivo(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode();
    // Reduz fotos muito grandes: o jsQR fica lento acima de ~1600px.
    const escala = Math.min(1, 1600 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    return await lerQR(imagem,
      Math.round(imagem.naturalWidth * escala),
      Math.round(imagem.naturalHeight * escala));
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
