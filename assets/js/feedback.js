/* Ícone de feedback presente em todas as páginas.

   Sem backend, o envio tem dois caminhos: se FEEDBACK_ENDPOINT estiver
   configurado (um formulário do Google, Formspree ou qualquer URL que aceite
   POST), o recado vai por ali; senão, o site abre o e-mail do usuário já
   preenchido para a LAAUSP. Em ambos os casos o texto fica guardado no
   aparelho, para nada se perder se o envio falhar. */

import { el } from "./liga.js";
import { FEEDBACK_ENDPOINT, EMAIL_FEEDBACK, CHAVE_FEEDBACK } from "./config.js";

const TIPOS = [
  ["sugestao", "Sugestão de melhoria"],
  ["erro", "Erro no site ou nos dados"],
  ["duvida", "Dúvida"],
  ["outro", "Outro assunto"],
];

function guardar(registro) {
  try {
    const anteriores = JSON.parse(localStorage.getItem(CHAVE_FEEDBACK)) || [];
    anteriores.unshift(registro);
    localStorage.setItem(CHAVE_FEEDBACK, JSON.stringify(anteriores.slice(0, 50)));
  } catch {
    /* navegação privada: segue sem histórico local */
  }
}

function corpoDoEmail({ tipo, mensagem, contato, pagina }) {
  const rotulo = TIPOS.find(([valor]) => valor === tipo)?.[1] || tipo;
  return [
    `Tipo: ${rotulo}`,
    `Página: ${pagina}`,
    contato ? `Contato: ${contato}` : "Contato: não informado",
    "",
    mensagem,
  ].join("\n");
}

async function enviar(registro) {
  if (!FEEDBACK_ENDPOINT) return "email";
  const resposta = await fetch(FEEDBACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registro),
  });
  if (!resposta.ok) throw new Error(`Falha no envio (${resposta.status})`);
  return "endpoint";
}

export function montarFeedback() {
  if (document.querySelector(".feedback-abrir")) return;

  const botao = el("button", {
    class: "feedback-abrir",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "feedback-painel",
    title: "Enviar feedback sobre o site",
  }, "💬", el("span", { text: "Feedback" }));

  const tipo = el("select", { id: "feedback-tipo" },
    ...TIPOS.map(([valor, rotulo]) => el("option", { value: valor, text: rotulo })));
  const mensagem = el("textarea", {
    id: "feedback-mensagem",
    placeholder: "O que dá para melhorar? Se for um erro, conte o que você estava fazendo.",
    required: "required",
  });
  const contato = el("input", {
    type: "text", id: "feedback-contato",
    placeholder: "Seu e-mail ou @ (opcional)",
  });
  const aviso = el("p", { class: "feedback-aviso", hidden: "hidden" });
  const enviarBotao = el("button", { type: "submit", text: "Enviar" });

  const formulario = el("form", { class: "feedback-painel__corpo" },
    el("label", { class: "campo", for: "feedback-tipo", text: "Assunto" }), tipo,
    el("label", { class: "campo", for: "feedback-mensagem", text: "Mensagem" }), mensagem,
    el("label", { class: "campo", for: "feedback-contato", text: "Contato" }), contato,
    enviarBotao, aviso);

  const painel = el("div", {
    class: "feedback-painel", id: "feedback-painel", hidden: "hidden",
    role: "dialog", "aria-label": "Enviar feedback",
  },
    el("div", { class: "feedback-painel__topo" },
      el("strong", { text: "Fale com a LAAUSP" }),
      el("button", { class: "feedback-painel__fechar", type: "button", "aria-label": "Fechar", text: "×" })),
    formulario);

  const alternar = (abrir) => {
    painel.hidden = !abrir;
    botao.setAttribute("aria-expanded", String(abrir));
    if (abrir) mensagem.focus();
  };

  botao.addEventListener("click", () => alternar(painel.hidden));
  painel.querySelector(".feedback-painel__fechar").addEventListener("click", () => alternar(false));
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !painel.hidden) alternar(false);
  });

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const texto = mensagem.value.trim();
    if (!texto) return;

    const registro = {
      tipo: tipo.value,
      mensagem: texto,
      contato: contato.value.trim(),
      pagina: location.pathname.split("/").pop() || "index.html",
      quando: new Date().toISOString(),
    };
    guardar(registro);

    aviso.hidden = false;
    aviso.className = "feedback-aviso";
    aviso.textContent = "Enviando…";
    enviarBotao.disabled = true;

    try {
      const caminho = await enviar(registro);
      if (caminho === "email") {
        const assunto = `Feedback do site LAAUSP — ${registro.pagina}`;
        location.href = `mailto:${EMAIL_FEEDBACK}?subject=${encodeURIComponent(assunto)}` +
          `&body=${encodeURIComponent(corpoDoEmail(registro))}`;
        aviso.className = "feedback-aviso feedback-aviso--ok";
        aviso.textContent = "Abrimos seu e-mail com a mensagem pronta — é só enviar. Obrigado!";
      } else {
        aviso.className = "feedback-aviso feedback-aviso--ok";
        aviso.textContent = "Recebemos seu recado. Obrigado por ajudar a melhorar o site!";
      }
      mensagem.value = "";
      contato.value = "";
    } catch (erro) {
      aviso.className = "feedback-aviso feedback-aviso--erro";
      aviso.textContent = `${erro.message} Seu texto ficou salvo neste aparelho — ` +
        `você pode escrever direto para ${EMAIL_FEEDBACK}.`;
    } finally {
      enviarBotao.disabled = false;
    }
  });

  document.body.append(botao, painel);
}
