/* Carteirinha digital da LAAUSP: estética macro da liga (azul-marinho, laranja e
   a faixa retrô do material gráfico) com a identidade micro da atlética nas
   cores da faixa e no monograma. */

import { el } from "./liga.js";
import { estaRegular, iniciais, idDoAtleta } from "./atletas.js";
import { textoSobre } from "./cores.js";

/** Payload lido pelo scanner do representante. */
export function payloadDaCarteirinha(atleta, temporada) {
  return `LAAUSP|${temporada}|${idDoAtleta(atleta)}`;
}

async function carregarGeradorQR() {
  if (window.qrcode) return window.qrcode;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "assets/vendor/qrcode.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Não foi possível carregar o gerador de QR."));
    document.head.append(script);
  });
  return window.qrcode;
}

export async function desenharQR(texto, tamanho = 156) {
  const qrcode = await carregarGeradorQR();
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const modulos = qr.getModuleCount();
  const escala = Math.max(1, Math.floor(tamanho / (modulos + 2)));
  const lado = (modulos + 2) * escala;

  const canvas = el("canvas", { width: lado, height: lado, "aria-label": "QR Code da carteirinha" });
  canvas.style.width = `${lado}px`;
  canvas.style.height = `${lado}px`;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lado, lado);
  ctx.fillStyle = "#000";
  for (let linha = 0; linha < modulos; linha += 1) {
    for (let coluna = 0; coluna < modulos; coluna += 1) {
      if (qr.isDark(linha, coluna)) {
        ctx.fillRect((coluna + 1) * escala, (linha + 1) * escala, escala, escala);
      }
    }
  }
  return canvas;
}

export async function montarCarteirinha(atleta, identidade, temporada) {
  const regular = estaRegular(atleta);
  const cartao = el("div", { class: "carteirinha" });
  const primaria = identidade.corPrimaria;
  // A secundária da atlética só vira texto quando o contraste permite ler.
  const sobrePrimaria = textoSobre(primaria, identidade.corSecundaria);
  cartao.style.setProperty("--atletica-primaria", primaria);
  cartao.style.setProperty("--atletica-secundaria", identidade.corSecundaria);
  cartao.style.setProperty("--atletica-texto", sobrePrimaria);

  cartao.append(
    el("div", { class: "faixa-retro" }),
    el("div", { class: "carteirinha__topo" },
      el("div", { class: "carteirinha__liga" },
        el("strong", { text: "LAAUSP" }),
        el("small", { text: "Liga das Atléticas da USP" })),
      el("div", { class: "carteirinha__temporada", text: `Temporada ${temporada}` })),

    el("div", { class: "carteirinha__faixa" },
      el("span", { class: "carteirinha__sigla", text: atleta.atletica }),
      identidade.unidade ? el("span", { class: "carteirinha__unidade", text: identidade.unidade }) : null),

    el("div", { class: "carteirinha__corpo" },
      el("div", { class: "carteirinha__monograma", text: iniciais(atleta.nome) }),
      el("div", {},
        el("p", { class: "carteirinha__nome", text: atleta.nome }),
        el("dl", { class: "carteirinha__dados" },
          el("dt", { text: "Nº USP" }), el("dd", { text: atleta.nusp || "não informado" }),
          el("dt", { text: "Vínculo" }), el("dd", { text: atleta.vinculo || "—" }),
          el("dt", { text: "Modalidades" }),
          el("dd", { text: atleta.modalidades?.length ? atleta.modalidades.join(", ") : "—" })))),

    el("div", { class: "carteirinha__rodape" },
      el("span", { class: `selo ${regular ? "selo--ok" : "selo--erro"}`,
        text: regular ? "Atleta regular" : `Situação: ${atleta.situacao || "irregular"}` }),
      el("span", { class: "carteirinha__validade", text: `Válida até 31/12/${temporada}` })));

  const qr = el("div", { class: "carteirinha__qr" });
  cartao.append(qr);
  try {
    qr.append(await desenharQR(payloadDaCarteirinha(atleta, temporada), 116));
  } catch {
    qr.append(el("span", { class: "carteirinha__qr-falha", text: "QR indisponível" }));
  }
  return cartao;
}
