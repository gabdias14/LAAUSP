# Régua de comunicação — Corta-vento G26 (LAAUSP)

Cada etapa começa com `## id :: Título :: Momento`, seguida dos metadados
(`alvo`, `objetivo`) e do texto da mensagem depois da linha `---`.

Placeholders disponíveis: `{primeiro_nome}` `{nome}` `{tamanho}`
`{personalizacao}` `{personalizacao_frase}` `{instituto}` `{pagamento}`
`{valor}` `{produto}` `{organizacao}` `{assinatura}` `{responsavel_nome}`
`{responsavel_link}` `{prazo_pendencia}` `{data_producao}` `{data_retirada}`
`{horario_retirada}` `{local_retirada}` `{link_form_correcao}` `{pagamento_frase}` `{chave_pix}`
`{prazo_pagamento}` `{nova_previsao}` `{motivo_atraso}`.

Formatação do WhatsApp: `*negrito*`, `_itálico_`.

## 1-confirmacao :: Confirmação do pedido :: D+0 (até 24h após o formulário)
alvo: todos
objetivo: dar recibo do pedido e travar as informações que vão para a produção
---
Fala, {primeiro_nome}! Aqui é a {organizacao} 💚

Recebemos seu pedido do *{produto}*:

• Tamanho: *{tamanho}*
• Personalização: {personalizacao_frase}
• Pagamento: {pagamento}
• Origem: {instituto}

Confere pra mim se está tudo certo? Qualquer ajuste de tamanho ou de nome nas costas só dá pra fazer *antes de fechar a arte*.

Se estiver ok, é só responder "confirmado" 🙌

## 2-pendencia-social :: Pendência do lote social :: D+1 (e reforço a cada 2 dias)
alvo: social_pendente
objetivo: recuperar o atestado de matrícula que falta para validar o lote social
---
Oi, {primeiro_nome}! Tudo certo?

Seu pedido do *{produto}* entrou como *lote social* ({valor}), mas aqui ainda falta o *atestado de matrícula*.

Consegue mandar por aqui mesmo (foto ou PDF) nos próximos {prazo_pendencia}? Sem esse documento a gente não consegue manter o valor social e o pedido volta para o valor cheio.

Qualquer dúvida é só chamar 🙏
{assinatura}

## 3-pendencia-pagamento :: Pendência de pagamento :: D+1 (e reforço a cada 2 dias)
alvo: pagamento_pendente
objetivo: fechar as compras marcadas como crédito, que não se concluem sozinhas
---
Oi, {primeiro_nome}! 👋

Seu pedido do *{produto}* (tamanho *{tamanho}*) está reservado, mas a compra no *crédito* precisa ser finalizada com o {responsavel_nome} — é ele que gera a maquininha/link.

Chama ele aqui: {responsavel_link}

Enquanto o pagamento não cai, o pedido não entra na lista de produção. Corre lá que ainda dá tempo 🏃
{assinatura}

## 4-conferencia-arte :: Conferência final da arte :: D-3 do fechamento do lote
alvo: personalizado
objetivo: última checagem da personalização antes de mandar para a estamparia
---
{primeiro_nome}, última chamada pra conferir a personalização do seu *{produto}* ✍️

Vai ser bordado/estampado exatamente assim:

*{personalizacao}*

Tamanho: *{tamanho}*

Confere acento, letra maiúscula e apelido. Depois que a arte for pro fornecedor não tem como alterar. Se estiver certo, responde "ok" — se quiser mudar algo, me fala hoje 🙏

## 5-producao :: Pedido em produção :: D+0 do fechamento do lote
alvo: todos
objetivo: avisar que o lote fechou e dar previsão, reduzindo o "chegou?"
---
Boa, {primeiro_nome}! 🚨

O lote do *{produto}* foi *fechado e enviado para produção* ({data_producao}).

Seu item: tamanho *{tamanho}* · {personalizacao_frase}

A previsão de entrega é {data_retirada}. Assim que chegar, eu te aviso por aqui com data, horário e local de retirada. Não precisa fazer nada agora 😉
{assinatura}

## 5b-atraso :: Aviso de atraso na produção :: D+0 do aviso da fábrica
alvo: todos
objetivo: avisar o atraso antes que perguntem, explicar a causa e dar nova previsão
---
Oi, {primeiro_nome}. Precisamos te dar uma notícia que não é a que a gente queria 😞

Tivemos um imprevisto fora do nosso controle: {motivo_atraso} que produz o *{produto}*. A linha ficou parada e o nosso lote *atrasou*.

📅 Nova previsão de entrega: *{nova_previsao}*

Sentimos muito de verdade. Sabemos que você comprou contando com o prazo que combinamos, e ficar sem resposta seria pior — por isso estamos avisando assim que a fábrica nos confirmou.

Nada muda no seu pedido: tamanho *{tamanho}*, {personalizacao_frase}, {pagamento_frase}. Assim que as peças saírem da produção, você é avisado por aqui com data, horário e local de retirada.

Qualquer dúvida, pode me chamar. Obrigado pela paciência 💚
{assinatura}

## 6-retirada :: Chegou! Agenda de retirada :: D+0 da chegada
alvo: todos
objetivo: converter a chegada do lote em retirada efetiva
---
{primeiro_nome}, chegou! 🎉

Seu *{produto}* (*{tamanho}*{personalizacao_sufixo}) já está com a gente.

📍 Local: {local_retirada}
📅 Data: {data_retirada}
⏰ Horário: {horario_retirada}

É só chegar e falar seu nome. Se não conseguir vir nesse dia, responde aqui que a gente combina outro horário 🤝

## 7-retirada-lembrete :: Lembrete de retirada :: D+3 e D+7 após a abertura da retirada
alvo: todos
objetivo: puxar quem ainda não retirou antes que o item vire estoque parado
---
Oi, {primeiro_nome}! Passando só pra lembrar 😊

Seu *{produto}* (*{tamanho}*) ainda está aqui esperando você.

📍 {local_retirada} · {horario_retirada}

Consegue passar essa semana? Se preferir, alguém pode retirar por você — só me avisa o nome da pessoa 🙏

## 8-parcela-2 :: Lembrete da 2ª parcela :: D+30 do pedido parcelado
alvo: parcelado
objetivo: cobrar a segunda parcela de quem escolheu Pix em 2x
---
Oi, {primeiro_nome}! Tudo bem?

Seu pedido do *{produto}* ficou como *Pix parcelado em 2x* e a *2ª parcela* está em aberto.

Assim que enviar, manda o comprovante por aqui que eu dou baixa na hora 🙌
Qualquer coisa, chama o {responsavel_nome}: {responsavel_link}

## 8b-cobranca-pix :: Cobrança do Pix em aberto :: D+2 do primeiro lembrete
alvo: parcelado
objetivo: fechar as parcelas de Pix ainda não pagas, com chave, valor e prazo
---
Oi, {primeiro_nome}! Tudo bem?

Passando pra fechar a pendência do seu *{produto}*: o pagamento ficou como *Pix em 2x* e a *2ª parcela ainda está em aberto* por aqui.

🔑 Chave Pix: *{chave_pix}*
💰 Valor total do pedido: {valor}
📅 Prazo: até *{prazo_pagamento}*

Assim que pagar, manda o comprovante nesta conversa que eu dou baixa na hora ✅

Se você já pagou e a baixa não apareceu, me manda o comprovante mesmo assim que eu acerto aqui — pode ter passado batido.

Qualquer coisa, chama o {responsavel_nome}: {responsavel_link}
{assinatura}

## 9-pos-entrega :: Pós-entrega e prova social :: D+2 após a retirada
alvo: todos
objetivo: gerar foto/depoimento e medir satisfação do lote
---
E aí, {primeiro_nome}! Curtiu o *{produto}*? 👀

Se puder, faz duas coisas rapidinho:
1) Manda uma foto usando — a gente repassa nos stories marcando você 📸
2) Responde de 0 a 10: qual a chance de você comprar o próximo lote da {organizacao}?

Seu feedback ajuda demais a acertar tamanho, tecido e prazo da próxima 💚
{assinatura}

## 10-reengajamento :: Próximo lote e modalidades :: D+30 após a entrega
alvo: todos
objetivo: reaproveitar a base para o próximo produto e para o esporte
---
Fala, {primeiro_nome}! 💚

Tô abrindo a lista de avisos do *próximo lote* da {organizacao} (quem está nela garante o preço de pré-venda e escolhe tamanho primeiro).

Quer entrar? Responde *EU QUERO*.

E me conta: você pratica alguma modalidade ou quer começar? Tem treino aberto rolando e dá pra te encaixar com o pessoal do seu instituto ({instituto}) 🏐🏀🥋
