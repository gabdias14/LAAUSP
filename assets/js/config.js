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

/* Para onde vai o feedback enviado pelo ícone de chat e pela página de contato.

   O site tenta, nesta ordem: o Google Forms, depois FEEDBACK_ENDPOINT, e por
   último abre o e-mail do usuário já preenchido. O caminho do e-mail perde
   quem não apertar "enviar" no aplicativo, então vale configurar o formulário.

   Como preencher FEEDBACK_GOOGLE_FORM: veja "Receber o feedback num Google
   Forms" no README — em resumo, a url é a do formulário trocando /viewform por
   /formResponse, e cada entry.N sai do HTML do formulário publicado. */
export const FEEDBACK_GOOGLE_FORM = {
  url: "",
  campos: {
    tipo: "",
    mensagem: "",
    nome: "",
    atletica: "",
    contato: "",
    pagina: "",
    quando: "",
  },
};

// Alternativa ao Google Forms: qualquer URL que aceite POST em JSON.
export const FEEDBACK_ENDPOINT = "";
export const EMAIL_FEEDBACK = "laausp@gmail.com";


export const CHAVE_SESSAO = "laausp:sessao-representante";
export const CHAVE_SESSAO_ATLETA = "laausp:sessao-atleta";
export const CHAVE_REGISTROS = "laausp:registros-scanner";
export const CHAVE_ELENCO = "laausp:elenco-importado";
export const CHAVE_FEEDBACK = "laausp:feedback";
