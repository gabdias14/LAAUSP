/* Base de filiados e identidade visual das atléticas.

   A lista real (data/filiados.json) é gerada por scripts/parse-filiados.py e
   não vai para o repositório; sem ela o site cai no arquivo de exemplo. */

let cacheFiliados = null;
let cacheAtleticas = null;

const IDENTIDADE_PADRAO = { corPrimaria: "#7d1128", corSecundaria: "#f6f1ea", unidade: "" };

export async function carregarFiliados() {
  if (cacheFiliados) return cacheFiliados;
  for (const caminho of ["data/filiados.json", "data/filiados.exemplo.json"]) {
    try {
      const resposta = await fetch(caminho, { cache: "no-cache" });
      if (!resposta.ok) continue;
      const dados = await resposta.json();
      cacheFiliados = { ...dados, exemplo: caminho.includes("exemplo") };
      return cacheFiliados;
    } catch {
      /* tenta o próximo caminho */
    }
  }
  throw new Error("Não foi possível carregar a lista de filiados.");
}

export async function carregarAtleticas() {
  if (cacheAtleticas) return cacheAtleticas;
  const resposta = await fetch("data/atleticas.json", { cache: "no-cache" });
  cacheAtleticas = resposta.ok ? (await resposta.json()).atleticas : [];
  return cacheAtleticas;
}

export function identidadeDa(sigla, atleticas) {
  return atleticas.find((a) => a.sigla === sigla) || { sigla, ...IDENTIDADE_PADRAO };
}

export function normalizar(texto) {
  return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Identificador estável do atleta — usado no QR e nas chaves locais. */
export function idDoAtleta(atleta) {
  return atleta.nusp || `${atleta.atletica}:${normalizar(atleta.nome).replace(/\s+/g, "-")}`;
}

export function buscarAtleta(filiados, { nusp, nome, atletica }) {
  const atletas = filiados.atletas;
  if (nusp) {
    const digitos = nusp.replace(/\D/g, "");
    const achado = atletas.find((a) => a.nusp && a.nusp === digitos);
    if (achado) return achado;
  }
  if (nome) {
    const alvo = normalizar(nome);
    const candidatos = atletas.filter((a) =>
      (!atletica || a.atletica === atletica) && normalizar(a.nome) === alvo);
    if (candidatos.length === 1) return candidatos[0];
    if (candidatos.length > 1) return { ambiguo: candidatos };
  }
  return null;
}

export function estaRegular(atleta) {
  return /^REGULAR$/i.test(atleta.situacao || "");
}

export function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter((p) => p.length > 2);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes.at(-1)?.[0] || "")).toUpperCase();
}
