/* Cores oficiais das atléticas, lidas do PLANILHÃO (data/atleticas.json).

   As equipes das tabelas dos jogos podem juntar várias atléticas ("QUIM+ECA",
   "FARMA+ODONTO+VET"), então a cor de uma equipe é a faixa com a cor de cada
   uma delas. */

let cache = null;

export async function carregarCores() {
  if (cache) return cache;
  const resposta = await fetch("data/atleticas.json", { cache: "no-cache" });
  const dados = resposta.ok ? await resposta.json() : { atleticas: [], apelidos: {} };
  const porSigla = new Map();
  for (const atletica of dados.atleticas) porSigla.set(atletica.sigla, atletica);
  cache = { ...dados, porSigla };
  return cache;
}

export function semAcento(texto) {
  return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
}

/** Acha a atlética pela sigla, aceitando os apelidos usados nas tabelas. */
export function acharAtletica(sigla, cores) {
  if (!sigla || !cores) return null;
  const alvo = semAcento(sigla);
  const direto = cores.porSigla.get(sigla.trim().toUpperCase());
  if (direto) return direto;
  const apelido = cores.apelidos?.[alvo];
  if (apelido && cores.porSigla.get(apelido)) return cores.porSigla.get(apelido);
  for (const atletica of cores.porSigla.values()) {
    if (semAcento(atletica.sigla) === alvo) return atletica;
  }
  return null;
}

/** Quebra "FARMA+ODONTO+VET" nas atléticas que compõem a equipe. */
export function atleticasDaEquipe(equipe, cores) {
  return (equipe || "")
    .split(/[+/&]/)
    .map((parte) => acharAtletica(parte, cores))
    .filter(Boolean);
}

function luminancia(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

export function contraste(corA, corB) {
  const [a, b] = [luminancia(corA), luminancia(corB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** Cor de texto legível sobre o fundo: a secundária da atlética quando dá, senão preto ou branco. */
export function textoSobre(fundo, preferida) {
  if (preferida && contraste(fundo, preferida) >= 3) return preferida;
  return contraste(fundo, "#ffffff") >= contraste(fundo, "#14192b") ? "#ffffff" : "#14192b";
}

/** Faixa de cores da equipe, pronta para usar como background CSS. */
export function faixaDaEquipe(equipe, cores) {
  const partes = atleticasDaEquipe(equipe, cores);
  if (!partes.length) return "var(--borda)";
  if (partes.length === 1) return partes[0].corPrimaria;
  const fatia = 100 / partes.length;
  const paradas = partes.map((a, i) =>
    `${a.corPrimaria} ${(i * fatia).toFixed(2)}% ${((i + 1) * fatia).toFixed(2)}%`);
  return `linear-gradient(90deg, ${paradas.join(", ")})`;
}
