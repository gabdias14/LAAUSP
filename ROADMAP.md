# Roadmap da plataforma da LAAUSP

Objetivo declarado: deixar de ser um site de consulta e virar a **ferramenta
oficial** onde as atléticas e a comunidade USP acompanham os Jogos da Liga.

Este arquivo é a lista viva do que falta e do que ainda não está decidido.
A skill `roadmap` (em `.claude/skills/roadmap/`) existe para consultar e
atualizar isto sem precisar reler o repositório inteiro.

---

## 1. A decisão que trava quase tudo: backend

Hoje o site é 100% estático. Para conferir um login, **o navegador baixa a base
de filiados inteira** — é assim que `atleta.html` e `restrito.html` funcionam.
Essa única característica é a causa raiz de metade dos itens abaixo.

Consequência direta: `data/filiados.json` (~3.200 pessoas, com nome, e-mail e
número USP) está no `.gitignore` e **não** é publicado. No ar, a área do atleta
cai em `data/filiados.exemplo.json`, que é fictício. Ou seja: **a área do atleta
publicada hoje não reconhece nenhum atleta real.**

Com o repositório público, publicar o arquivo real tornaria a lista inteira
acessível a qualquer pessoa — o que a LGPD citada no próprio formulário de
filiação não permite.

### O que um backend (Supabase) resolve de uma vez

| Problema de hoje | Como o backend resolve |
| --- | --- |
| Base de filiados não pode ser publicada | Fica no banco; o navegador consulta só o próprio registro |
| Senha no `config.js` não é segurança | Auth de verdade, com papéis (atleta, representante, diretoria) |
| Conferência de súmula roda no cliente | Verificação no servidor, com registro de quem conferiu |
| Feedback sem caixa de entrada | Tabela `feedback`, com status e responsável |
| Status do atleta desatualizado | Atualização agendada escrevendo no banco, sem commitar dados |
| Fidelidade só no `localStorage` | Carimbos no banco, à prova de troca de aparelho e de fraude |

### Esboço de esquema

```
atleticas      (id, sigla, nome, cor_primaria, cor_secundaria, apelidos[])
pessoas        (id, nome, nusp, email, codigo_ecard, vinculo)
filiacoes      (pessoa_id, atletica_id, temporada, situacao, pagamento)
modalidades    (id, nome, genero)
equipes        (id, modalidade_id, atletica_ids[])   -- combinadas, até 3 (Art. 6 §2)
jogos          (id, codigo, modalidade_id, equipe_a, equipe_b, data, local, rodada, placar_a, placar_b)
classificacao  (modalidade_id, equipe_id, grupo, j, p, v, d, pontos_pro, pontos_contra)
leituras       (id, jogo_id, pessoa_id, quando, formato, resultado, conferido_por)
feedback       (id, tipo, mensagem, contato, pagina, quando, status)
carimbos       (pessoa_id, quando, dado_por, resgatado_em)
```

Vínculos que importam: `filiacoes` é o que decide quem entra em súmula
(Artigo 7 e Artigo 8 §1); `equipes.atletica_ids` é o que permite equipe
combinada; `leituras.pessoa_id` é o que liga o e-Card lido ao atleta.

**Pendente de você:** criar o projeto no Supabase e passar a URL e a chave
anônima. O resto (esquema, RLS, migração dos dados, cliente no site) eu monto.

---

## 2. Melhorias pendentes

| # | Item | Por que importa | Depende de |
| --- | --- | --- | --- |
| 1 | Publicar a base real de filiados com segurança | A área do atleta no ar hoje é fictícia | Backend |
| 2 | Login de verdade | `liga2026` no `config.js` só esconde a tela; o JS é baixado por qualquer visitante | Backend |
| 3 | Importar as fichas das demais atléticas | Só 145 de ~3.200 têm número USP, e sem ele **o e-Card não identifica o atleta** | Fichas das atléticas |
| 4 | Caixa de entrada do feedback | Hoje abre o e-mail da pessoa; quem não apertar "enviar" some sem deixar rastro | Google Forms (decidido) ou backend |
| 5 | Aba própria de classificação | Hoje ela fica no fim de `jogos.html`, embaixo de 169 jogos e com 11 modalidades empilhadas | — |
| 6 | Simulador de mata-mata | Artigo 16 define séries Ouro/Prata e o chaveamento | Dúvida D1 |
| 7 | Atualização automática dos dados | Segunda 18h e sexta 23h, pedido da liga | Fazer os scripts buscarem a planilha (ver abaixo) |
| 8 | Fidelidade da pizzaria fora do `localStorage` | Some ao trocar de aparelho e é forjável pelo próprio atleta | Backend |
| 9 | Limpar o histórico do git | O repositório é público e o histórico ainda tem número USP, e-mail USP e código de e-Card reais | Decisão sua (reescrita é destrutiva) |
| 10 | Testes automatizados | Não existe nenhum; toda validação até aqui foi manual no navegador | — |
| 11 | Reservas de quadra | Planilha `[CONTROLE 2026] RESERVAS QUADRAS`, fora do MVP | Backend |
| 12 | Envio de súmulas pelos representantes | Fora do MVP | Backend |

### Detalhe do item 7 — por que a atualização semanal ainda não existe

Pedido: atualizar segunda às 18h e sexta às 23h. Em UTC, que é o fuso do cron do
GitHub Actions, isso é `0 21 * * 1` e `0 2 * * 6` — a sexta 23h BRT cai no sábado
em UTC, então o dia da semana muda.

O que impede, e não é só uma decisão:

1. **Os scripts não buscam nada.** `scripts/parse-sheet.py` consome um export
   manual em markdown (`scripts/export-planilha.md`), com marcadores
   `\[merged\]` de célula mesclada. Para rodar sozinho, ele precisaria ler a
   planilha direto — o caminho provável é `export?format=xlsx` mais openpyxl,
   que traz todas as abas e preserva as mesclagens numa requisição só.
2. **Não dá para escrever isso às cegas.** O ambiente onde este código foi
   desenvolvido bloqueia `docs.google.com` no proxy, então não foi possível
   inspecionar a estrutura real do arquivo nem testar o parser. Subir um
   workflow agendado com parser não verificado só produziria falha silenciosa
   duas vezes por semana.
3. **A metade do atleta não pode ser commitada.** O status do atleta vem de
   `data/filiados.json`, com ~3.200 pessoas. Com o repositório público, um
   workflow que commite esse arquivo expõe a base inteira. Essa metade depende
   do backend (seção 1), não de ajuste no script.

Ou seja: a parte de jogos e classificação é viável assim que o parser buscar a
planilha, e vale fazer. A parte do status do atleta não é viável sem backend.

---

## 3. Dúvidas em aberto

**D1 — Séries Ouro e Prata.** O Artigo 16 diz que a série Ouro tem no máximo 8
equipes, mas o §4 descreve um chaveamento de 16 (1×16, 8×9, 4×13, 5×12 de um
lado; 2×15, 7×10, 3×14, 6×11 do outro). Os dois não fecham: ou o chaveamento de
16 é da competição inteira antes da divisão, ou cada série tem a própria chave.
Além disso, §1 vale para número par **e menor que 15**, e §2 para ímpar **e
menor que 16** — com 17 inscritos (Basquete M, Futsal F, Futsal M) nenhum dos
dois se aplica. Como a liga faz na prática?

**D2 — Critérios de desempate.** O regulamento remete aos "Regulamentos
Específicos de Modalidades", documento que não está no repositório. Sem ele não
dá para recalcular classificação a partir de resultados simulados — só para
simular o mata-mata a partir da classificação já publicada.

**D3 — Quem administra.** Quantas pessoas vão operar a ferramenta, e em quais
papéis (diretoria, representante de atlética, mesa)? Isso define o modelo de
permissão no backend.

**D4 — Base legal da LGPD.** Para exibir situação de filiação de terceiros, qual
a base legal e o texto de consentimento no formulário de filiação atual?

**D5 — Domínio e hospedagem.** A liga tem domínio próprio? Hoje está em
`gabdias14.github.io/LAAUSP`, que é uma conta pessoal — ruim para uma ferramenta
oficial.

**D6 — Formato do e-Card.** O QR do aplicativo da USP traz um código de cartão
de 10 dígitos, não o número USP; na Apple Wallet o mesmo cartão vira Code 128
com o número USP. O código de 10 dígitos muda quando a pessoa perde o cartão e
tira a segunda via?

**D7 — Estrutura da planilha.** Para automatizar a leitura é preciso saber como
as abas estão organizadas no arquivo original (nomes, posição das tabelas,
mesclagens). O export em markdown no repositório é um retrato, não a fonte.

---

## 4. Decidido

- **Wallet removido.** Apple Wallet e Google Wallet exigem certificado da liga
  (Apple Developer Program, US$ 99/ano) que não existe. Os botões nunca
  funcionaram. Gerador no histórico do git, se um dia houver credencial.
- **Feedback via Google Forms.** Escolhido em vez de Formspree ou Apps Script.
- **Elegibilidade por filiação, não por ficha.** Artigo 7 e Artigo 8 §1:
  qualquer atleta filiado regular de uma das atléticas da equipe pode jogar
  qualquer modalidade. Modalidade e naipe na ficha são intenção, não restrição.
- **Repositório público.** Feito em 21/09/2026, com os dados pessoais do estado
  atual já removidos. O histórico não foi reescrito.
