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

export const CHAVE_SESSAO = "laausp:sessao-representante";
export const CHAVE_SESSAO_ATLETA = "laausp:sessao-atleta";
export const CHAVE_REGISTROS = "laausp:registros-scanner";
export const CHAVE_ELENCO = "laausp:elenco-importado";
