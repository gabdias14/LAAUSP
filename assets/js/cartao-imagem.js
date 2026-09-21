/* Levar a carteirinha para o celular.

   Dois caminhos: a imagem PNG desenhada no canvas, que salva na galeria ou vai
   pelo compartilhar; e o atalho na tela de início (PWA), que abre a carteirinha
   mesmo sem sinal — importante porque ginásio costuma não ter rede. */

import { el } from "./liga.js";
import { estaRegular, iniciais } from "./atletas.js";
import { textoSobre } from "./cores.js";
import { desenharQR, payloadDaCarteirinha } from "./carteirinha.js";

const LARGURA = 1000;
const ALTURA = 630;
const ESCALA = 2;

function texto(ctx, conteudo, x, y, { tamanho = 28, peso = 400, cor = "#fff", maiuscula = false, espaco = 0, alinhamento = "left" }) {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.textAlign = alinhamento;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${peso} ${tamanho}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const valor = maiuscula ? conteudo.toUpperCase() : conteudo;
  if (!espaco) {
    ctx.fillText(valor, x, y);
    ctx.restore();
    return ctx.measureText(valor).width;
  }
  // Canvas não tem letter-spacing em todos os navegadores: desenha letra a letra.
  let cursor = x;
  for (const letra of valor) {
    ctx.fillText(letra, cursor, y);
    cursor += ctx.measureText(letra).width + espaco;
  }
  ctx.restore();
  return cursor - x;
}

function quebrar(ctx, conteudo, largura, tamanho, peso) {
  ctx.save();
  ctx.font = `${peso} ${tamanho}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const linhas = [];
  let atual = "";
  for (const palavra of conteudo.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  ctx.restore();
  return linhas;
}

function retanguloArredondado(ctx, x, y, largura, altura, raio) {
  ctx.beginPath();
  ctx.roundRect(x, y, largura, altura, raio);
}

/** Desenha a carteirinha em um canvas, no mesmo layout da tela. */
export async function desenharCarteirinha(atleta, identidade, temporada) {
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA * ESCALA;
  canvas.height = ALTURA * ESCALA;
  const ctx = canvas.getContext("2d");
  ctx.scale(ESCALA, ESCALA);

  const primaria = identidade.corPrimaria || "#142156";
  const secundaria = identidade.corSecundaria || "#ffffff";
  const sobrePrimaria = textoSobre(primaria, secundaria);

  // Fundo azul-marinho da liga
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, "#1b2a6b");
  fundo.addColorStop(0.45, "#142156");
  fundo.addColorStop(1, "#0c1436");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Faixa retrô
  const listras = ["#ef8a3c", "#afdbf4", "#5c7dde", "#ffffff"];
  listras.forEach((cor, i) => {
    ctx.fillStyle = cor;
    ctx.fillRect(0, i * 5, LARGURA, 5);
  });

  // Cabeçalho da liga
  ctx.fillStyle = "#0c1436";
  ctx.fillRect(0, 20, LARGURA, 92);
  texto(ctx, "LAAUSP", 44, 68, { tamanho: 34, peso: 800, espaco: 4 });
  texto(ctx, "Liga das Atléticas da USP", 44, 94, { tamanho: 19, cor: "#c9d2ee" });

  const rotuloTemporada = `TEMPORADA ${temporada}`;
  ctx.font = '800 17px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const larguraPilula = ctx.measureText(rotuloTemporada).width + 24 + rotuloTemporada.length * 1.5;
  ctx.fillStyle = "#ef8a3c";
  retanguloArredondado(ctx, LARGURA - 44 - larguraPilula, 50, larguraPilula, 34, 17);
  ctx.fill();
  texto(ctx, rotuloTemporada, LARGURA - 44 - larguraPilula + 12, 73, {
    tamanho: 17, peso: 800, cor: "#14192b", espaco: 1.5,
  });

  // Faixa da atlética
  ctx.fillStyle = secundaria;
  ctx.fillRect(0, 112, LARGURA, 96);
  ctx.fillStyle = primaria;
  ctx.fillRect(0, 116, LARGURA, 88);
  const larguraSigla = texto(ctx, atleta.atletica, 44, 172, {
    tamanho: 40, peso: 800, cor: sobrePrimaria, maiuscula: true, espaco: 1.5,
  });
  if (identidade.unidade) {
    texto(ctx, identidade.unidade, 44 + larguraSigla + 18, 170, {
      tamanho: 18, cor: sobrePrimaria,
    });
  }

  // Monograma
  ctx.fillStyle = primaria;
  retanguloArredondado(ctx, 44, 248, 112, 112, 22);
  ctx.fill();
  ctx.strokeStyle = secundaria;
  ctx.lineWidth = 4;
  retanguloArredondado(ctx, 44, 248, 112, 112, 22);
  ctx.stroke();
  texto(ctx, iniciais(atleta.nome), 100, 322, {
    tamanho: 42, peso: 800, cor: sobrePrimaria, alinhamento: "center",
  });

  // Nome e dados
  const linhasNome = quebrar(ctx, atleta.nome, 440, 34, 700);
  linhasNome.slice(0, 2).forEach((linha, i) => {
    texto(ctx, linha, 186, 284 + i * 40, { tamanho: 34, peso: 700 });
  });

  const topoDados = 284 + Math.min(linhasNome.length, 2) * 40 + 12;
  const campos = [
    ["Nº USP", atleta.nusp || "não informado"],
    ["Vínculo", atleta.vinculo || "—"],
    ["Modalidades", atleta.modalidades?.length ? atleta.modalidades.join(", ") : "—"],
  ];
  campos.forEach(([rotulo, valor], i) => {
    const y = topoDados + i * 30;
    texto(ctx, rotulo, 186, y, { tamanho: 18, cor: "#aab6dd" });
    const linhas = quebrar(ctx, String(valor), 300, 19, 600);
    texto(ctx, linhas[0], 330, y, { tamanho: 19, peso: 600 });
  });

  // Selo de situação e validade
  const regular = estaRegular(atleta);
  const selo = regular ? "ATLETA REGULAR" : `SITUAÇÃO: ${(atleta.situacao || "irregular").toUpperCase()}`;
  ctx.font = '800 17px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const larguraSelo = ctx.measureText(selo).width + 28 + selo.length * 1.2;
  ctx.fillStyle = regular ? "#dcfce7" : "#fee2e2";
  retanguloArredondado(ctx, 44, ALTURA - 96, larguraSelo, 38, 19);
  ctx.fill();
  texto(ctx, selo, 58, ALTURA - 70, {
    tamanho: 17, peso: 800, cor: regular ? "#14532d" : "#7f1d1d", espaco: 1.2,
  });
  texto(ctx, `Válida até 31/12/${temporada}`, 44, ALTURA - 32, { tamanho: 17, cor: "#aab6dd" });

  // QR Code
  const qr = await desenharQR(payloadDaCarteirinha(atleta, temporada), 190);
  const lado = 190;
  ctx.fillStyle = "#fff";
  retanguloArredondado(ctx, LARGURA - 44 - lado - 16, ALTURA - 60 - lado - 16, lado + 32, lado + 32, 16);
  ctx.fill();
  ctx.drawImage(qr, LARGURA - 44 - lado, ALTURA - 60 - lado, lado, lado);

  return canvas;
}

export async function baixarCarteirinhaPNG(atleta, identidade, temporada) {
  const canvas = await desenharCarteirinha(atleta, identidade, temporada);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(blob);
  const nome = `carteirinha-laausp-${atleta.nusp || atleta.atletica}.png`;
  const link = el("a", { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return nome;
}

/** Compartilha a carteirinha pelo menu nativo do celular, quando disponível. */
export async function compartilharCarteirinha(atleta, identidade, temporada) {
  const canvas = await desenharCarteirinha(atleta, identidade, temporada);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const arquivo = new File([blob], `carteirinha-laausp-${atleta.nusp}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({ files: [arquivo], title: "Carteirinha LAAUSP" });
    return true;
  }
  return false;
}
