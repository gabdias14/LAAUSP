# LAAUSP — site da Liga das Atléticas da USP

MVP do site da LAAUSP: área pública com a **tabela dos Jogos da Liga** e o
**calendário** da temporada, e uma **área restrita aos representantes** com o
scanner de QR Code do e-Card USP.

Site estático (HTML + CSS + JS de módulo, sem build). Basta servir a pasta.

```
python3 -m http.server 8000     # http://localhost:8000
```

## Páginas

| Página | O que faz |
| --- | --- |
| `index.html` | Resumo da temporada, próximos jogos e últimos resultados. |
| `jogos.html` | Tabela completa com filtros (modalidade, situação, atlética, busca) e classificação geral e por grupo. |
| `calendario.html` | Jogos agrupados por dia, com filtro de rodada/período e exportação `.ics`. |
| `restrito.html` | Área do representante: leitura do QR do e-Card, conferência contra a lista de inscritos e registro das leituras. |

## Dados dos jogos

`data/liga.json` é gerado a partir da planilha pública
[\[PÚBLICA\] TABELA GERAL - JOGOS DA LIGA](https://docs.google.com/spreadsheets/d/1xVSMcugSbGGE2-QiPbOJJF1oLZkGpt--MnFXKczq3vU/edit).
Estão incluídas 11 modalidades (basquete, futsal, handebol, vôlei, futebol de
campo e tênis de campo), com local, data, horário, código do jogo, placar,
rodada e as tabelas de classificação.

Para atualizar depois de mexer na planilha:

1. Exporte a planilha em markdown (Arquivo → Baixar, ou o export do conector do
   Google Drive) e salve em `scripts/export-planilha.md`.
2. Rode o parser:

```bash
python3 scripts/parse-sheet.py scripts/export-planilha.md > data/liga.json
```

O parser localiza os blocos `Local | Data | Hora | Código` de cada aba de
modalidade e as tabelas de classificação, e cruza os códigos dos jogos com as
abas de calendário para preencher rodada e dia da semana.

## Área restrita e o QR do e-Card

O QR Code do e-Card USP carrega **apenas o código numérico do cartão**
(10 dígitos) — ele **não é** o número USP. Por isso a conferência funciona assim:

1. O operador lê o QR (câmera ao vivo ou foto do e-Card enviada pelo atleta).
2. O site procura esse código em `data/atletas.json` (ou na lista importada no
   aparelho) e mostra **Liberado para jogar**, **Impedido** ou
   **Não encontrado na lista**.
3. Quando o código é novo, aparece a caixa **Vincular e-Card a um atleta**: o
   operador informa o número USP e o vínculo passa a valer nas próximas leituras.
   A lista pode ser exportada em CSV para virar a base oficial de inscritos.

Isso cobre o piloto: peça aos atletas a foto do e-Card, leia todas pela opção
**Ler de uma foto**, vincule cada código a um número USP e exporte a lista.

Formato da lista de inscritos (`data/atletas.json`, ou CSV/JSON importado):

```json
[{ "nusp": "11918672", "codigoEcard": "1051139627", "nome": "Fulana de Tal",
   "atletica": "EACH", "modalidade": "FM", "situacao": "inscrito" }]
```

`situacao` valendo `inscrito`, `apto`, `ok` ou `aprovado` libera o atleta;
qualquer outro valor (`pendente`, `suspenso`…) aparece como impedido.

As leituras ficam em `localStorage` do aparelho do operador e podem ser
exportadas em CSV (data/hora, código do e-Card, número USP, jogo, resultado).

### Leitor de QR

Usa a API nativa `BarcodeDetector` quando disponível e cai para o
[jsQR](https://github.com/cozmo/jsQR) (`assets/vendor/jsQR.js`, MIT) nos demais
navegadores, incluindo Safari/iOS. **A câmera só abre em HTTPS** (ou em
`localhost`) — publique o site antes de usar no jogo.

### Limite conhecido do acesso restrito

Como o site é estático, a senha da área restrita mora no próprio código
(`assets/js/config.js`) e apenas esconde a tela do operador — ela **não é
segurança de verdade**. Serve para o piloto do scanner; antes de guardar dados
de atletas de forma permanente é preciso um backend com autenticação real
(login por atlética, papéis de representante/gestão) e banco de dados.

Senha atual: `liga2026`. Para trocar, gere o hash e cole em `config.js`:

```bash
printf 'nova-senha' | sha256sum
```

## Publicação

`.github/workflows/pages.yml` publica a pasta inteira no GitHub Pages a cada
push na `main` (basta habilitar Pages → Source: GitHub Actions no repositório).

## Próximos passos do plano

Fora do MVP, mas previstos: solicitação de quadras pelas atléticas, envio de
súmulas pelos representantes, carteirinha/desconto CICO, notificações por e-mail
e o painel da gestão.
