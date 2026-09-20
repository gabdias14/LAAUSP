/* Programa de fidelidade da Pizzaria Europa: 7 pizzas carimbadas, a 8ª é grátis.

   Os carimbos ficam no aparelho do atleta (localStorage). Cada carimbo exige a
   senha do caixa da pizzaria, para o atleta não carimbar sozinho — o que é uma
   trava de balcão, não de servidor. Quando houver backend, os carimbos passam a
   ser gravados lá. */

import { el } from "./liga.js";

export const CARIMBOS_PARA_PREMIO = 7;
const CHAVE = "laausp:fidelidade";

export function lerCartao(idAtleta) {
  try {
    const tudo = JSON.parse(localStorage.getItem(CHAVE)) || {};
    return tudo[idAtleta] || { carimbos: [], resgates: [] };
  } catch {
    return { carimbos: [], resgates: [] };
  }
}

function gravarCartao(idAtleta, cartao) {
  try {
    const tudo = JSON.parse(localStorage.getItem(CHAVE)) || {};
    tudo[idAtleta] = cartao;
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
  } catch {
    /* navegação privada: o cartão vale só enquanto a aba estiver aberta */
  }
}

export function carimbar(idAtleta) {
  const cartao = lerCartao(idAtleta);
  if (cartao.carimbos.length >= CARIMBOS_PARA_PREMIO) return cartao;
  cartao.carimbos.push(new Date().toISOString());
  gravarCartao(idAtleta, cartao);
  return cartao;
}

export function desfazerUltimoCarimbo(idAtleta) {
  const cartao = lerCartao(idAtleta);
  cartao.carimbos.pop();
  gravarCartao(idAtleta, cartao);
  return cartao;
}

export function resgatar(idAtleta) {
  const cartao = lerCartao(idAtleta);
  if (cartao.carimbos.length < CARIMBOS_PARA_PREMIO) return cartao;
  cartao.resgates.push({ quando: new Date().toISOString(), carimbos: cartao.carimbos });
  cartao.carimbos = [];
  gravarCartao(idAtleta, cartao);
  return cartao;
}

export function completo(cartao) {
  return cartao.carimbos.length >= CARIMBOS_PARA_PREMIO;
}

/** Desenha as 8 casas: 7 de pizza consumida e a 8ª, do brinde. */
export function montarCartela(cartao) {
  const cartela = el("div", { class: "cartela" });
  for (let indice = 0; indice < CARIMBOS_PARA_PREMIO; indice += 1) {
    const carimbado = indice < cartao.carimbos.length;
    cartela.append(el("div", {
      class: `casa${carimbado ? " casa--carimbada" : ""}`,
      title: carimbado ? new Date(cartao.carimbos[indice]).toLocaleDateString("pt-BR") : "",
    },
      el("span", { class: "casa__icone", text: "🍕" }),
      el("span", { class: "casa__numero", text: String(indice + 1) })));
  }
  cartela.append(el("div", {
    class: `casa casa--premio${completo(cartao) ? " casa--carimbada" : ""}`,
    title: completo(cartao) ? "Pizza grátis liberada" : "Complete as 7 casas",
  },
    el("span", { class: "casa__icone", text: "★" }),
    el("span", { class: "casa__numero", text: "GRÁTIS" })));
  return cartela;
}
