/* Configuração da área restrita.

   ATENÇÃO: este site é 100% estático, então a "senha" abaixo só esconde a tela
   do operador — ela NÃO é um controle de segurança de verdade (qualquer pessoa
   com o link consegue ler este arquivo). Use-a apenas para o piloto do scanner
   e troque por autenticação de servidor antes de guardar dados de atletas.

   Para trocar a senha, gere o hash SHA-256 e cole abaixo:
     printf 'nova-senha' | sha256sum
*/

// Hash de "liga2026".
export const HASH_SENHA_REPRESENTANTE =
  "60edaaa578a1df0775ae01af93d47031e96c7cb4a9e153fb6e910a262ece934a";

// Hash de "europa2026" — senha do caixa da Pizzaria Europa para carimbar.
export const HASH_SENHA_PIZZARIA =
  "b524e3a759c4de0022cdcbed5545435ab160517ff9c6b8d0b00f3b1f79c59db7";

// Para onde vai o feedback enviado pelo ícone de chat do site.
// Com FEEDBACK_ENDPOINT vazio, o site abre o e-mail do usuário já preenchido.
// Preencha com a URL de um formulário (Google Forms, Formspree, Apps Script)
// que aceite POST em JSON para receber os recados direto na caixa da liga.
export const FEEDBACK_ENDPOINT = "";
export const EMAIL_FEEDBACK = "laausp@gmail.com";

// Passes de carteirinha para Apple Wallet e Google Wallet, gerados em lote por
// scripts/gerar-wallet.py. Aponte para a pasta onde os arquivos foram
// publicados; vazio esconde os botões.
//   WALLET_APPLE_BASE + "<numeroUSP>.pkpass"
//   WALLET_GOOGLE_BASE + "<numeroUSP>.txt"  (arquivo com o link de salvar)
export const WALLET_APPLE_BASE = "";
export const WALLET_GOOGLE_BASE = "";

export const CHAVE_SESSAO = "laausp:sessao-representante";
export const CHAVE_SESSAO_ATLETA = "laausp:sessao-atleta";
export const CHAVE_REGISTROS = "laausp:registros-scanner";
export const CHAVE_ELENCO = "laausp:elenco-importado";
export const CHAVE_FEEDBACK = "laausp:feedback";
