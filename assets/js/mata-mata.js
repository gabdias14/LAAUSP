/* Fase de Eliminatórias — Artigo 16 do Regulamento Oficial dos Jogos da Liga.

   Duas regras vivem aqui: como as equipes se dividem entre as séries Ouro e
   Prata, e como a chave é emparceirada dentro de cada série.

   Sobre o emparceiramento: o §4 lista, para 16 classificadas, 1×16, 8×9, 4×13,
   5×12 de um lado e 2×15, 7×10, 3×14, 6×11 do outro. Isso é exatamente a
   semeadura padrão de chave olímpica, que ordemDeChave() gera para qualquer
   tamanho — conferido contra a lista do regulamento no teste do módulo. O §5
   manda, quando há menos de 16, eliminar as colocações inexistentes e passar
   direto quem as enfrentaria: é o bye. */

/** Semeadura padrão: ordemDeChave(16) reproduz a lista do §4 na ordem. */
export function ordemDeChave(tamanho) {
  let ordem = [1];
  while (ordem.length < tamanho) {
    const total = ordem.length * 2;
    ordem = ordem.flatMap((s) => [s, total + 1 - s]);
  }
  return ordem;
}

/** Menor potência de 2 que comporta n. */
function potencia(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Divisão entre séries Ouro e Prata, pelo Artigo 16.
 *
 * O caput põe teto de 8 na Ouro e dispensa a divisão com menos de 8 inscritas.
 * O §1 (par e menos de 15 inscritas) dá 2 a mais para a Ouro, salvo com
 * exatamente 8, em que as séries se igualam. O §2 (ímpar e menos de 16) dá 1 a
 * mais para a Ouro.
 *
 * Fora dessas faixas o regulamento só deixa o teto do caput — é o caso de 17
 * inscritas, que acontece em três modalidades. Por isso o retorno traz
 * `regra`, para a tela poder dizer de onde saiu o número, e a divisão é
 * ajustável na interface.
 */
export function dividirSeries(total) {
  if (total < 8) return { ouro: total, prata: 0, regra: "menos de 8 inscritas: série única (caput)" };
  if (total === 8) return { ouro: 4, prata: 4, regra: "8 inscritas: séries iguais (§1, exceção)" };

  const par = total % 2 === 0;
  if (par && total < 15) {
    const ouro = Math.min(8, (total + 2) / 2);
    return { ouro, prata: total - ouro, regra: "par e menos de 15: Ouro com 2 a mais (§1)" };
  }
  if (!par && total < 16) {
    const ouro = Math.min(8, (total + 1) / 2);
    return { ouro, prata: total - ouro, regra: "ímpar e menos de 16: Ouro com 1 a mais (§2)" };
  }
  return { ouro: 8, prata: total - 8, regra: "teto de 8 na Ouro (caput); §1 e §2 não alcançam este total" };
}

/**
 * Monta a chave a partir das equipes já ordenadas por classificação.
 * Devolve uma lista de fases, cada uma com seus confrontos. Confronto com
 * apenas um lado é bye: quem está nele avança sem jogar (§5).
 */
export function montarChave(equipes) {
  const n = equipes.length;
  if (n < 2) return [];

  const tamanho = potencia(n);
  const primeira = [];
  const ordem = ordemDeChave(tamanho);

  for (let i = 0; i < ordem.length; i += 2) {
    const a = ordem[i] <= n ? { seed: ordem[i], nome: equipes[ordem[i] - 1] } : null;
    const b = ordem[i + 1] <= n ? { seed: ordem[i + 1], nome: equipes[ordem[i + 1] - 1] } : null;
    primeira.push({ a, b, vencedor: null });
  }

  const fases = [primeira];
  let atual = primeira;
  while (atual.length > 1) {
    const proxima = [];
    for (let i = 0; i < atual.length; i += 2) proxima.push({ a: null, b: null, vencedor: null });
    fases.push(proxima);
    atual = proxima;
  }
  return fases;
}

/** Nome da fase pelo número de confrontos que ela tem. */
export function nomeDaFase(confrontos) {
  return { 1: "Final", 2: "Semifinais", 4: "Quartas de final", 8: "Oitavas de final" }[confrontos]
    || `Fase de ${confrontos} confrontos`;
}

/**
 * Propaga os vencedores fase a fase. Um confronto em que só um lado existe é
 * bye e resolve sozinho; um confronto sem escolha para a fase seguinte vazia.
 */
export function propagar(fases) {
  for (const confronto of fases[0]) {
    if (confronto.a && !confronto.b) confronto.vencedor = "a";
    if (!confronto.a && confronto.b) confronto.vencedor = "b";
  }
  for (let f = 1; f < fases.length; f += 1) {
    const anterior = fases[f - 1];
    for (let i = 0; i < fases[f].length; i += 1) {
      const esquerda = anterior[i * 2];
      const direita = anterior[i * 2 + 1];
      const novoA = esquerda?.vencedor ? esquerda[esquerda.vencedor] : null;
      const novoB = direita?.vencedor ? direita[direita.vencedor] : null;
      const confronto = fases[f][i];
      // Trocar um lado invalida a escolha que dependia dele.
      if (confronto.a?.seed !== novoA?.seed && confronto.vencedor === "a") confronto.vencedor = null;
      if (confronto.b?.seed !== novoB?.seed && confronto.vencedor === "b") confronto.vencedor = null;
      confronto.a = novoA;
      confronto.b = novoB;
      // Aqui um lado vazio é confronto ainda não decidido, não bye: só a
      // primeira fase tem colocação inexistente para eliminar (§5).
    }
  }
  return fases;
}
