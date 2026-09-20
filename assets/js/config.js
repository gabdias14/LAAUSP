/* Configuração da área restrita.

   ATENÇÃO: este site é 100% estático, então a "senha" abaixo só esconde a tela
   do operador — ela NÃO é um controle de segurança de verdade (qualquer pessoa
   com o link consegue ler este arquivo). Use-a apenas para o piloto do scanner
   e troque por autenticação de servidor antes de guardar dados de atletas.

   Para trocar a senha, gere o hash SHA-256 e cole abaixo:
     printf 'nova-senha' | sha256sum
*/

// Senha do representante. O valor em claro nao fica no repositorio.
export const HASH_SENHA_REPRESENTANTE =
  "cda0b2813f74574c7f7b70154cfdf971d82d54bc70b4fd00875d2a8ae085b4a2";

// Senha do caixa da Pizzaria Europa para carimbar. Idem: sem valor em claro aqui.
export const HASH_SENHA_PIZZARIA =
  "244629b330883e18459a719ba2575e6b072d4c2311acd92a9ef995bb968b0c62";

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
