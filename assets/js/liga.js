/* Camada de dados compartilhada: carrega data/liga.json e oferece helpers
   de formatação/ordenação usados pelas páginas públicas e pela área restrita. */

const MES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIA_NOME = ["domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado"];

import { carregarCores, faixaDaEquipe } from "./cores.js";

let cache = null;
let cores = null;

export async function carregarLiga() {
  if (cache) return cache;
  const base = document.body.dataset.base || "";
  const resposta = await fetch(`${base}data/liga.json`, { cache: "no-cache" });
  if (!resposta.ok) throw new Error(`Falha ao carregar os dados (${resposta.status})`);
  cache = await resposta.json();
  cores = await carregarCores().catch(() => null);
  for (const modalidade of cache.modalidades) {
    for (const jogo of modalidade.jogos) {
      jogo.modalidadeNome = modalidade.nome;
      jogo.quando = paraData(jogo.data, jogo.hora, cache.temporada);
      jogo.encerrado = jogo.placarA !== "" && jogo.placarB !== "";
    }
  }
  return cache;
}

/** "16/08" + "08:30" -> Date local (a planilha não guarda o ano). */
export function paraData(data, hora, ano) {
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec((data || "").trim());
  if (!m) return null;
  const [, dia, mes, anoCelula] = m;
  let anoFinal = Number(anoCelula || ano) || new Date().getFullYear();
  if (anoFinal < 100) anoFinal += 2000;
  const h = /^(\d{1,2}):(\d{2})$/.exec((hora || "").trim());
  return new Date(anoFinal, Number(mes) - 1, Number(dia),
    h ? Number(h[1]) : 0, h ? Number(h[2]) : 0);
}

export function chaveDoDia(data) {
  if (!data) return "sem-data";
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function rotuloDoDia(data) {
  if (!data) return "Data a definir";
  return `${DIA_NOME[data.getDay()]}, ${data.getDate()} de ${MES_NOME[data.getMonth()]}`;
}

export function todosOsJogos(liga) {
  return liga.modalidades.flatMap((m) => m.jogos);
}

export function ordenarPorData(jogos) {
  return [...jogos].sort((a, b) => {
    if (!a.quando && !b.quando) return a.codigo.localeCompare(b.codigo);
    if (!a.quando) return 1;
    if (!b.quando) return -1;
    return a.quando - b.quando || a.codigo.localeCompare(b.codigo);
  });
}

export function agruparPorDia(jogos) {
  const mapa = new Map();
  for (const jogo of ordenarPorData(jogos)) {
    const chave = chaveDoDia(jogo.quando);
    if (!mapa.has(chave)) mapa.set(chave, { data: jogo.quando, jogos: [] });
    mapa.get(chave).jogos.push(jogo);
  }
  return [...mapa.values()];
}

/** Cria um elemento com atributos e filhos — evita innerHTML com dados da planilha. */
export function el(tag, props = {}, ...filhos) {
  const node = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (chave === "class") node.className = valor;
    else if (chave === "text") node.textContent = valor;
    else if (valor !== null && valor !== undefined) node.setAttribute(chave, valor);
  }
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    node.append(typeof filho === "string" ? document.createTextNode(filho) : filho);
  }
  return node;
}

/** Selo com as cores da atlética, ao lado do nome da equipe. */
export function corDaEquipe(equipe) {
  const selo = el("span", { class: "cor-equipe", "aria-hidden": "true" });
  selo.style.background = cores ? faixaDaEquipe(equipe, cores) : "var(--borda)";
  return selo;
}

export function cartaoDeJogo(jogo, { mostrarModalidade = true } = {}) {
  const a = Number(jogo.placarA);
  const b = Number(jogo.placarB);
  const aVenceu = jogo.encerrado && a > b;
  const bVenceu = jogo.encerrado && b > a;

  return el("article", { class: "jogo" },
    el("div", { class: "jogo__hora" },
      jogo.hora || "—",
      el("small", { text: jogo.data || "data a definir" })),
    el("div", { class: "jogo__times" },
      el("div", { class: `jogo__time${aVenceu ? " venceu" : ""}` },
        corDaEquipe(jogo.equipeA), jogo.equipeA || "A definir"),
      jogo.encerrado
        ? el("div", { class: "jogo__placar", text: `${jogo.placarA} × ${jogo.placarB}` })
        : el("div", { class: "jogo__vs", text: "×" }),
      el("div", { class: `jogo__time jogo__time--b${bVenceu ? " venceu" : ""}` },
        jogo.equipeB || "A definir", corDaEquipe(jogo.equipeB))),
    el("div", { class: "jogo__meta" },
      mostrarModalidade ? el("div", { text: jogo.modalidadeNome }) : null,
      el("div", { text: [jogo.local, jogo.rodada].filter(Boolean).join(" · ") || "—" }),
      el("span", { class: "etiqueta", text: jogo.codigo })));
}

export function marcarNavegacao() {
  const atual = location.pathname.split("/").pop() || "index.html";
  for (const link of document.querySelectorAll(".nav a")) {
    if (link.getAttribute("href") === atual) link.setAttribute("aria-current", "page");
  }
}
