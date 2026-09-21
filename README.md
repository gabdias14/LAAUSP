# LAAUSP — site da Liga das Atléticas da USP

MVP do site da LAAUSP: área pública com a **tabela dos Jogos da Liga** e o
**calendário** da temporada, e uma **área restrita aos representantes** com o
scanner de QR Code do e-Card USP.

Site estático (HTML + CSS + JS de módulo, sem build). Basta servir a pasta.

A identidade visual segue o material gráfico da liga (@dino.laausp): azul-marinho
`#142156`, laranja `#ef8a3c` e as faixas retrô em azul claro `#afdbf4` e azul
médio `#5c7dde` sobre off-white `#f2f2f2`. As cores ficam todas em variáveis CSS
no topo de `assets/css/style.css`, e a faixa de listras é a classe `.faixa-retro`.

```
python3 -m http.server 8000     # http://localhost:8000
```

## Páginas

| Página | O que faz |
| --- | --- |
| `index.html` | Resumo da temporada, próximos jogos e últimos resultados. |
| `jogos.html` | Tabela completa com filtros (modalidade, situação, atlética, busca) e classificação geral e por grupo. |
| `calendario.html` | Jogos agrupados por dia, com filtro de rodada/período e exportação `.ics`. |
| `regulamento.html` | Regulamento Oficial dos Jogos da Liga, em PDF, com leitor embutido e download. |
| `contato.html` | Feedback e solicitações: canal público para sugestões, solicitações, dúvidas e reclamações. |
| `atleta.html` | Área do atleta: carteirinha digital da LAAUSP e cartela de fidelidade da Pizzaria Europa. |
| `restrito.html` | Área do representante: leitura do QR do e-Card **e da carteirinha LAAUSP**, conferência contra a lista de inscritos e registro das leituras. |

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
[{ "nusp": "10000001", "codigoEcard": "9000000001", "nome": "Fulana de Tal",
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

A senha nao fica em claro no repositorio — so o hash SHA-256, em
`config.js`. Para trocar, gere o hash do novo valor e cole la:

```bash
printf 'nova-senha' | sha256sum
```

## Regulamento

`documentos/regulamento-jogos-da-liga-2026.pdf` é o export do documento
"Regulamento Oficial - Jogos da Liga 2026" da LAAUSP. Para atualizar, exporte o
Google Doc em PDF e substitua o arquivo com o mesmo nome.

## Feedback dos usuários

Toda página tem um ícone de chat no canto inferior direito: assunto, mensagem e
contato opcional. Como não há backend, o envio segue um de dois caminhos,
configurados em `assets/js/config.js`:

- `FEEDBACK_ENDPOINT` preenchido (Google Forms, Formspree, Apps Script) → o
  recado vai por `POST` em JSON direto para a caixa da liga;
- `FEEDBACK_ENDPOINT` vazio (padrão) → o site abre o e-mail do usuário já
  preenchido para `EMAIL_FEEDBACK`.

Nos dois casos a mensagem também fica guardada no `localStorage` do aparelho,
para não se perder se o envio falhar.

## Quem pode jogar cada partida

A regra é a do regulamento, não a da ficha de filiação:

> **Artigo 7** — jogam os alunos da IES devidamente matriculados.
> **Artigo 8, § 1º** — a verificação do representante antes da súmula "tem um
> caráter meramente de conferência de filiação".

Ou seja: **pode jogar quem é filiado regular de uma das atléticas que formam a
equipe** (uma equipe reúne até três atléticas, pelo Artigo 6, § 2º). Qualquer
atleta filiado pode jogar qualquer modalidade — a modalidade e o naipe
declarados na ficha são intenção de competir, não restrição.

Na área do representante, escolher o jogo faz esse cruzamento na hora, sobre a
própria filiação: o resultado passa de "está filiada?" para "pode entrar na
súmula **desta** partida?". Quem é de outra atlética aparece como **Não é de
nenhuma das equipes deste jogo**; quem está irregular continua impedido.

`scripts/cruzar-elenco.py` faz o mesmo cruzamento fora do site, para a
organização conferir a cobertura antes da rodada ou exportar a lista de uma
partida:

```bash
python3 scripts/cruzar-elenco.py HM --resumo        # regulares por equipe
python3 scripts/cruzar-elenco.py HM --jogo HM-14    # quem pode jogar a partida
```

A coluna `DECLARARAM` do resumo mostra quantos declararam aquela modalidade na
ficha — informação útil para a atlética montar o time, sem valor de restrição.

## Área do atleta

O atleta entra pelo **número USP** ou pela dupla **atlética + nome completo**,
conferidos contra a base de filiados. A área tem duas abas:

### Carteirinha digital

Carteirinha com a estética macro da LAAUSP (azul-marinho, faixa retrô, selo da
liga e a temporada em laranja) e a identidade micro da atlética (faixa e cores próprias, sigla e
unidade). Traz nome, número USP, vínculo, modalidades, selo de **atleta
regular/irregular**, validade e um **QR Code** no formato:

```
LAAUSP|<temporada>|<número USP ou atlética:nome>
```

Esse QR é lido pelo mesmo scanner da área restrita: o representante aponta a
câmera para a carteirinha do atleta e o site confere a situação da filiação na
hora, sem depender do e-Card da USP. O botão **Salvar / imprimir** gera uma
versão só da carteirinha para PDF.

### Cores das atléticas

As cores de cada atlética são as **oficiais, lidas do próprio planilhão**: em
cada aba `<SIGLA>`, o título da linha 1 é pintado com a cor primária no
preenchimento e a secundária na fonte. `scripts/parse-cores-atleticas.py`
extrai as duas e gera `data/atleticas.json`:

```bash
# baixe o planilhão como .xlsx (Arquivo → Fazer download → Microsoft Excel)
python3 scripts/parse-cores-atleticas.py planilhao.xlsx > data/atleticas.json
```

Essas cores aparecem em todo o site: no selo ao lado de cada equipe na tabela e
no calendário (equipes combinadas, como `FARMA+ODONTO+VET`, viram uma faixa com
a cor de cada atlética) e na faixa e no monograma da carteirinha.

Quando a cor secundária não tem contraste suficiente sobre a primária — o branco
sobre o azul claro da EDUCA, por exemplo — o texto cai para preto ou branco e a
cor da atlética fica na borda, para a carteirinha continuar legível. A regra
está em `textoSobre()`, em `assets/js/cores.js`.

### Levar a carteirinha no celular

Dois caminhos, na aba da carteirinha:

1. **Salvar como imagem** — a carteirinha é desenhada num `canvas` e baixada em
   PNG (`assets/js/cartao-imagem.js`). Funciona em qualquer celular, sem depender
   de nada da liga. Onde o navegador permite, o botão **Compartilhar** manda a
   mesma imagem pelo menu nativo.
2. **Instalar na tela de início** — `manifest.webmanifest` e `sw.js` fazem o
   site abrir como aplicativo e **funcionar sem sinal**, que é a situação real
   do ginásio. As páginas e os dados ficam em cache; a filiação é revalidada
   quando há rede.

Também dá para **imprimir** a carteirinha: o `@media print` do `style.css` tira
a navegação e os cartões de apoio, solta o QR do posicionamento absoluto e força
a impressão do fundo, para o cartão sair inteiro em uma página.

Apple Wallet e Google Wallet foram removidos: os dois exigem assinatura com
certificado da liga (Apple Developer Program, US$ 99/ano, e Google Wallet
Console), que não existe. Os botões nunca funcionavam. O gerador de passes está
no histórico do git, em `scripts/gerar-wallet.py`, se a liga tirar as
credenciais um dia.

### Fidelidade Pizzaria Europa

Cartela de 8 casas: **7 pizzas carimbadas e a 8ª é grátis**. O carimbo é dado
pelo caixa da pizzaria, que digita a senha (hash em
`assets/js/config.js`) no aparelho do atleta; há botão de desfazer o último
carimbo e de resgatar a pizza grátis, que zera a cartela e guarda o histórico.

Os carimbos ficam no `localStorage` do aparelho do atleta — trocar de celular
ou limpar o navegador zera a cartela. É o suficiente para validar o programa com
a pizzaria; para valer de verdade, os carimbos precisam de backend.

## Base de filiados

`scripts/parse-filiados.py` converte os exports das planilhas de filiação em
`data/filiados.json`. Ele entende os dois formatos: o **planilhão**
(`<SIGLA> ATLETAS REGULARES`) e as **respostas do formulário de filiação** de
cada atlética, e junta os dois pelo número USP ou pelo nome — o planilhão dá a
situação (REGULAR/IRREGULAR) e o formulário dá número USP, e-mail, naipe e
modalidades.

```bash
python3 scripts/parse-filiados.py planilhao.md filiacao-each.md > data/filiados.json
```

O **CPF do formulário é descartado de propósito** pelo parser: a carteirinha não
precisa dele.

> **Dados pessoais.** `data/filiados.json` tem nome, e-mail e número USP de
> ~3.400 atletas, então está no `.gitignore` e não vai para o repositório. O
> site cai em `data/filiados.exemplo.json` (dados fictícios) quando o arquivo
> real não existe. Atenção: publicar o site com o arquivo real **torna essa
> lista pública** — em um site estático não há como o navegador consultar a base
> sem baixá-la. Se isso não for aceitável (e provavelmente não é, pela LGPD
> citada no próprio formulário), a área do atleta precisa do backend com login
> antes de ir ao ar com os dados reais.

## Publicação

`.github/workflows/pages.yml` publica a pasta inteira no GitHub Pages a cada
push na `main` (basta habilitar Pages → Source: GitHub Actions no repositório).

## Próximos passos do plano

Fora do MVP, mas previstos:

- **Reservas de quadra** — a partir da planilha `[CONTROLE 2026] RESERVAS QUADRAS`:
  solicitação pelas atléticas até o antepenúltimo dia do mês, montagem
  automática da tabela do mês e aviso por e-mail para DMs, DGEs e presidências.
- Envio de súmulas pelos representantes depois do jogo.
- Desconto CICO na carteirinha.
- Painel da gestão, com permissão para alterar todo o resto.
- Backend com login de verdade (atleta, representante, gestão), que é o que
  destrava publicar a base de filiados com segurança.
