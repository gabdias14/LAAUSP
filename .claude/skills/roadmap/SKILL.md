---
name: roadmap
description: Consultar e atualizar o roadmap da plataforma da LAAUSP — o que falta melhorar, o que está decidido e as dúvidas em aberto. Use ao começar uma sessão nova neste repositório, ao planejar o que fazer em seguida, ao concluir um item, ao tomar uma decisão de arquitetura, ou quando o usuário perguntar "o que falta", "o que já foi decidido" ou "quais são as dúvidas".
---

# Roadmap da LAAUSP

O estado do projeto mora em `ROADMAP.md`, na raiz do repositório. Ele tem quatro
seções: a decisão de backend, a tabela de melhorias pendentes, as dúvidas em
aberto (D1…D6) e o que já foi decidido.

## Antes de responder ou planejar

Leia `ROADMAP.md` inteiro. É curto e é a fonte da verdade sobre o que falta —
não reconstrua esse estado varrendo o código, e não confie na sua memória de
sessões anteriores.

Confira também o que mudou desde a última atualização:

```bash
git log --oneline -15
git log -1 --format=%cd -- ROADMAP.md
```

Se houver commits mexendo em áreas que o roadmap lista como pendentes, o roadmap
provavelmente está atrasado — atualize antes de planejar em cima dele.

## O contexto que mais muda as respostas

Três fatos que explicam a maioria dos itens pendentes e que é fácil esquecer:

1. **O site é estático.** Para conferir um login, o navegador baixa a base de
   filiados inteira. É por isso que `data/filiados.json` não pode ser publicado
   e que a área do atleta no ar hoje usa dados fictícios.
2. **O repositório é público.** Qualquer coisa commitada fica visível, inclusive
   no histórico. Nunca commite `data/filiados.json` nem dados pessoais reais em
   arquivos de exemplo.
3. **Elegibilidade é por filiação, não por ficha.** Artigo 7 e Artigo 8 §1 do
   regulamento. Qualquer atleta filiado regular de uma das atléticas da equipe
   pode jogar qualquer modalidade.

## Ao concluir um item

Mova a linha da tabela da seção 2 para a seção 4 (Decidido), com uma frase
dizendo o que ficou resolvido e o que não ficou. Não apague o item: o histórico
de por que algo foi feito é o que evita refazer a mesma discussão.

## Ao tomar uma decisão de arquitetura

Registre na seção 4 com a razão, não só a conclusão. Se a decisão fechar uma
dúvida de D1…D6, diga qual e como.

## Ao descobrir uma dúvida nova

Acrescente em D-seguinte com: o que está ambíguo, onde isso aparece (artigo do
regulamento, arquivo, ou dado), e o que trava enquanto não for respondido. Uma
dúvida sem consequência declarada não merece entrar.

## Limites

Não invente respostas para D1…D6. São perguntas que dependem da liga ou do
usuário — em particular D1 (séries Ouro/Prata) e D2 (critérios de desempate),
que não dá para deduzir do regulamento que está no repositório. Se um item
depende de uma dessas, diga isso em vez de escolher uma interpretação em
silêncio.
