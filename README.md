# Régua de comunicação — Corta-vento G26 (LAAUSP)

Régua de WhatsApp construída a partir da planilha **VENDAS - CORTA-VENTO G26**
(63 pedidos). O objetivo é sair do atendimento reativo: cada pedido recebe a
mensagem certa no momento certo, disparada do **seu próprio número** — sem API,
sem custo e sem risco de bloqueio por automação em massa.

## Como disparar

```bash
python3 scripts/gerar_regua.py          # gera tudo em saida/
open saida/painel.html                  # (Linux: xdg-open)
```

O `painel.html` lista, etapa por etapa, cada contato com um botão **Abrir no
WhatsApp**: o clique abre a conversa (Web ou app) com o texto já escrito e
personalizado — você só confere e aperta enviar. O check de "já enviei" fica
salvo no navegador, então dá pra parar e voltar depois.

Quem preferir planilha usa `saida/disparos_<etapa>.csv`, que tem nome, telefone
em E.164, link pronto e o texto da mensagem.

> Dispare em blocos de ~20 conversas com intervalo entre elas. Envio manual a
> partir do seu número é seguro; centenas de mensagens idênticas em minutos é o
> que faz o WhatsApp sinalizar a conta.

## As 10 etapas

| # | Etapa | Quando | Quem recebe | Para quê |
| --- | --- | --- | --- | --- |
| 1 | Confirmação do pedido | até 24h após o formulário | todos (63) | recibo + trava tamanho e personalização |
| 2 | Pendência do lote social | D+1, reforço a cada 2 dias | social sem atestado (10) | recuperar o atestado de matrícula |
| 3 | Pendência de pagamento | D+1, reforço a cada 2 dias | pagamento em crédito (3) | fechar a compra com o responsável |
| 4 | Conferência final da arte | D-3 do fechamento do lote | com personalização (47) | evitar erro de bordado/estampa |
| 5 | Pedido em produção | fechamento do lote | todos | dar previsão e cortar o "chegou?" |
| 5b | **Aviso de atraso** | disparo atual | todos (63) | avisar o atraso do fornecedor e prometer o aviso da retirada |
| 6 | Chegou! Agenda de retirada | chegada do lote | todos | converter chegada em retirada |
| 7 | Lembrete de retirada | D+3 e D+7 | quem não retirou | esvaziar o estoque parado |
| 8 | Lembrete da 2ª parcela | D+30 do pedido | Pix em 2x (8) | cobrar a parcela em aberto |
| 8b | **2ª parcela na retirada** | disparo atual, após o 5b | Pix em 2x (8) | avisar que a 2ª parcela fica para o dia da entrega |
| 9 | Pós-entrega e prova social | D+2 da retirada | todos | foto para stories + nota de 0 a 10 |
| 10 | Próximo lote e modalidades | D+30 da entrega | todos | lista de pré-venda + captação para o esporte |

As etapas 7 e 9 saem com o segmento `todos` porque a planilha não registra quem
já retirou. Assim que houver essa coluna, basta apontar o `alvo` da etapa para o
segmento novo.

## Etapas ativas

Cada etapa tem um campo `ativo:`. Por padrão o gerador só monta as marcadas com
`ativo: sim` — hoje as duas do disparo atual (5b e 8b). As demais continuam
escritas e versionadas; para vê-las de novo, rode com `--todas` ou marque
`ativo: sim` na etapa.

## Estrutura

```
dados/pedidos.csv        export da planilha (troque por um novo export quando quiser)
regua/mensagens.md       os textos das 10 etapas — é aqui que você edita a copy
regua/config.json        produto, valores, datas, local de retirada, responsável
scripts/gerar_regua.py   monta os disparos, o painel e o relatório
scripts/gerar_controle.py  monta a planilha de controle de envio
dados/status.csv         exceções do disparo (não enviada, falhou, já pagou…)
saida/                   painel.html, disparos_<etapa>.csv e relatorio.md (gerados)
```

### Editar as mensagens

`regua/mensagens.md` é texto puro. Cada etapa tem um cabeçalho
`## id :: Título :: Momento`, o campo `alvo:` (qual segmento recebe) e o corpo
depois do `---`. Placeholders como `{primeiro_nome}`, `{tamanho}`,
`{personalizacao}` e `{valor}` são preenchidos por pedido; `*negrito*` e
`_itálico_` são a formatação do WhatsApp.

Segmentos disponíveis: `todos`, `social`, `social_pendente`,
`pagamento_pendente`, `parcelado`, `pagamento_em_aberto`, `personalizado`,
`sem_personalizacao`.

### Atualizar os dados

Baixe a planilha como CSV (`Arquivo → Fazer download → CSV`), salve em
`dados/pedidos.csv` e rode o script de novo. O leitor reconhece os cabeçalhos do
Google Forms por aproximação, então pequenas mudanças de título não quebram nada.

### Antes de disparar: preencha o `config.json`

`data_producao`, `data_retirada`, `horario_retirada` e `local_retirada` estão
como "a definir" e aparecem assim nas mensagens das etapas 5, 6 e 7.

Para a etapa **5b (atraso)**: preencha `nova_previsao` — é a informação que a
pessoa está esperando, e a mensagem perde o efeito sem ela. O `motivo_atraso`
já vem com a explicação da chuva na fábrica e pode ser ajustado ao que a
fábrica te passou.

Para a etapa **8b (cobrança do Pix)**: preencha `chave_pix` e `prazo_pagamento`.

A etapa 5b adapta sozinha a linha de status: quem está com Pix parcelado ou
crédito em aberto recebe "com a 2ª parcela ainda em aberto" em vez de "já pago",
pra não dar quitação a quem ainda deve.

## Controle de envio

`python3 scripts/gerar_controle.py` cruza a base com `dados/status.csv` e gera
`saida/controle_envio.csv`: uma linha por pedido, com a coluna do disparo
(Enviada / Não enviada / Falhou), o status do pagamento e a pendência de cada um.

Quem não estiver em `status.csv` entra como **Enviada**, com o status derivado do
próprio pedido. Para registrar uma exceção, acrescente a linha em
`dados/status.csv` (nome exatamente como está na base) e rode de novo.

## O que o relatório apontou

`saida/relatorio.md` é gerado junto e lista as inconsistências dos dados. Nesta
base:

- **10 pedidos de lote social sem atestado de matrícula** — só o comprovante de
  auxílio foi enviado. É a etapa 2, e é dinheiro: são R$ 15 de diferença por peça.
- **3 pedidos em crédito** ainda não finalizados (Lucas Galvão, Julia Reis,
  Mayara Raposo) — etapa 3.
- **Nina Drumond / Nina Drumons** (linhas 50 e 54) têm o mesmo telefone e
  tamanhos diferentes (G e P): confirme se são dois pedidos ou um duplicado. A
  aba de custos da planilha também marca "considerar só um pedido" no caso do
  AAAVC — daí 63 respostas e 62 peças.
- **Gisele Carvalho** informou um telefone com 10 dígitos; o script acrescentou o
  9 para montar o link, mas vale conferir antes de enviar.
- A coluna *"Você pratica alguma modalidade?"* está vazia em 100% dos pedidos —
  a etapa 10 usa a régua para finalmente coletar isso.
