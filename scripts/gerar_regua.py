#!/usr/bin/env python3
"""Gera os disparos da régua de comunicação do WhatsApp a partir da planilha de vendas.

Lê o CSV exportado do Google Forms (dados/pedidos.csv), aplica os templates de
regua/mensagens.md aos segmentos de cada etapa e escreve em saida/:

  - painel.html          página com um botão por contato (abre o WhatsApp já com o texto)
  - disparos_<etapa>.csv fila de envio da etapa (nome, telefone, link, mensagem)
  - relatorio.md         inconsistências dos dados e resumo dos segmentos

Uso:
    python3 scripts/gerar_regua.py
    python3 scripts/gerar_regua.py --etapa 1-confirmacao --csv dados/pedidos.csv
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import unicodedata
import urllib.parse
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSV_PADRAO = RAIZ / "dados" / "pedidos.csv"
MENSAGENS = RAIZ / "regua" / "mensagens.md"
CONFIG = RAIZ / "regua" / "config.json"
SAIDA = RAIZ / "saida"

DDI = "55"


# --------------------------------------------------------------------------- dados


def sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def chave_coluna(nome: str) -> str:
    """Normaliza o cabeçalho do Forms: 'Número de Telefone' -> 'numero de telefone'."""
    return re.sub(r"\s+", " ", sem_acento(nome).strip().lower()).rstrip("?").strip()


COLUNAS = {
    "timestamp": ("timestamp", "carimbo de data/hora"),
    "nome": ("qual seu nome", "nome"),
    "telefone": ("numero de telefone", "telefone", "whatsapp"),
    "social": ("desejo ser contemplado no lote social", "lote social", "social"),
    "atestado": ("atestado de matricula", "atestado"),
    "auxilio": ("comprovante de auxilio", "auxilio"),
    "tamanho": ("qual tamanho voce escolhe", "tamanho"),
    "personalizacao": ("personalizacao",),
    "pagamento": ("pagamento",),
    "comprovante": ("comprovante de pagamento",),
    "instituto": ("instituto/atletica de origem", "instituto"),
    "pago": ("pago",),
    "parcela2_paga": ("2a parcela paga", "2ª parcela paga", "pago2x"),
    "nao_enviar": ("nao enviar",),
}


@dataclass
class Pedido:
    linha: int
    nome: str
    telefone_bruto: str
    telefone: str
    timestamp: str = ""
    social: str = ""
    atestado: str = ""
    auxilio: str = ""
    tamanho: str = ""
    personalizacao: str = ""
    pagamento: str = ""
    comprovante: str = ""
    instituto: str = ""
    parcela2_paga: str = ""
    nao_enviar: str = ""
    alertas: list[str] = field(default_factory=list)

    @property
    def primeiro_nome(self) -> str:
        partes = self.nome.strip().split()
        return partes[0].strip().title() if partes else "pessoa"

    @property
    def e_social(self) -> bool:
        return self.social.strip().lower().startswith("s")

    @property
    def social_pendente(self) -> bool:
        return self.e_social and not self.atestado.strip()

    @property
    def pagamento_pendente(self) -> bool:
        return "credito" in sem_acento(self.pagamento).lower()

    @property
    def parcelado(self) -> bool:
        return "2x" in self.pagamento.lower()

    @property
    def parcela_em_aberto(self) -> bool:
        paga = self.parcela2_paga.strip().lower().startswith(("s", "t", "1"))
        return self.parcelado and not paga

    @property
    def personalizado(self) -> bool:
        return bool(self.personalizacao.strip())

    @property
    def enviavel(self) -> bool:
        return bool(self.telefone) and not self.nao_enviar.strip()


def normalizar_telefone(bruto: str) -> tuple[str, str | None]:
    """Devolve (E.164 sem '+', alerta). Telefone vazio ou implausível volta como ''."""
    digitos = re.sub(r"\D", "", bruto or "")
    if not digitos:
        return "", "telefone em branco"
    if digitos.startswith(DDI) and len(digitos) in (12, 13):
        digitos = digitos[2:]
    if len(digitos) == 11 and digitos[2] == "9":
        return DDI + digitos, None
    if len(digitos) == 10:
        # celular antigo sem o 9 ou fixo: tenta corrigir, mas sinaliza
        return DDI + digitos[:2] + "9" + digitos[2:], "10 dígitos — o 9 foi acrescentado, confira"
    if len(digitos) == 11:
        return DDI + digitos, "11 dígitos sem o 9 na posição esperada, confira"
    return "", f"número implausível ({digitos})"


def ler_pedidos(caminho: Path) -> list[Pedido]:
    with caminho.open(encoding="utf-8-sig", newline="") as fh:
        leitor = csv.DictReader(fh)
        if not leitor.fieldnames:
            raise SystemExit(f"CSV sem cabeçalho: {caminho}")
        mapa: dict[str, str] = {}
        for campo in leitor.fieldnames:
            chave = chave_coluna(campo)
            for destino, aliases in COLUNAS.items():
                if destino in mapa:
                    continue
                if any(chave.startswith(alias) for alias in aliases):
                    mapa[destino] = campo
                    break
        faltando = {"nome", "telefone"} - set(mapa)
        if faltando:
            raise SystemExit(f"Colunas obrigatórias não encontradas no CSV: {faltando}")

        pedidos: list[Pedido] = []
        for i, bruta in enumerate(leitor, start=2):
            valor = lambda k: (bruta.get(mapa[k]) or "").strip() if k in mapa else ""
            nome = valor("nome")
            if not nome and not valor("telefone"):
                continue
            telefone, alerta = normalizar_telefone(valor("telefone"))
            pedido = Pedido(
                linha=i,
                nome=nome,
                telefone_bruto=valor("telefone"),
                telefone=telefone,
                timestamp=valor("timestamp"),
                social=valor("social"),
                atestado=valor("atestado"),
                auxilio=valor("auxilio"),
                tamanho=valor("tamanho"),
                personalizacao=valor("personalizacao"),
                pagamento=valor("pagamento"),
                comprovante=valor("comprovante"),
                instituto=valor("instituto"),
                parcela2_paga=valor("parcela2_paga"),
                nao_enviar=valor("nao_enviar"),
            )
            if pedido.nao_enviar:
                pedido.alertas.append(f"fora do envio: {pedido.nao_enviar}")
            if alerta:
                pedido.alertas.append(alerta)
            if pedido.e_social and not pedido.atestado.strip():
                pedido.alertas.append("lote social sem atestado de matrícula")
            if valor("pago").strip().upper() == "FALSE":
                pedido.alertas.append("marcado como não pago na planilha")
            elif not pedido.comprovante.strip() and not pedido.pagamento_pendente:
                pedido.alertas.append("sem comprovante de pagamento")
            if not pedido.tamanho.strip():
                pedido.alertas.append("sem tamanho")
            pedidos.append(pedido)

    por_telefone: dict[str, list[Pedido]] = defaultdict(list)
    for p in pedidos:
        if p.telefone:
            por_telefone[p.telefone].append(p)
    for telefone, grupo in por_telefone.items():
        if len(grupo) > 1:
            linhas = ", ".join(str(g.linha) for g in grupo)
            for p in grupo:
                p.alertas.append(f"telefone repetido nas linhas {linhas} — possível pedido duplicado")
    return pedidos


# ----------------------------------------------------------------------- templates


@dataclass
class Etapa:
    id: str
    titulo: str
    momento: str
    alvo: str
    objetivo: str
    corpo: str
    ativo: bool = True


SEGMENTOS = {
    "todos": lambda p: True,
    "social_pendente": lambda p: p.social_pendente,
    "pagamento_pendente": lambda p: p.pagamento_pendente,
    "parcelado": lambda p: p.parcelado,
    "parcela_em_aberto": lambda p: p.parcela_em_aberto,
    "personalizado": lambda p: p.personalizado,
    "sem_personalizacao": lambda p: not p.personalizado,
    "social": lambda p: p.e_social,
    "pagamento_em_aberto": lambda p: p.pagamento_pendente or p.parcelado,
}


def ler_etapas(caminho: Path) -> list[Etapa]:
    texto = caminho.read_text(encoding="utf-8")
    etapas: list[Etapa] = []
    for bloco in re.split(r"^## ", texto, flags=re.M)[1:]:
        cabecalho, _, resto = bloco.partition("\n")
        partes = [p.strip() for p in cabecalho.split("::")]
        identificador = partes[0]
        titulo = partes[1] if len(partes) > 1 else identificador
        momento = partes[2] if len(partes) > 2 else ""
        meta_txt, _, corpo = resto.partition("\n---\n")
        meta = {}
        for linha in meta_txt.strip().splitlines():
            chave, _, valor = linha.partition(":")
            if valor:
                meta[chave.strip().lower()] = valor.strip()
        alvo = meta.get("alvo", "todos")
        if alvo not in SEGMENTOS:
            raise SystemExit(
                f"Etapa '{identificador}': alvo '{alvo}' desconhecido. "
                f"Use um de: {', '.join(SEGMENTOS)}"
            )
        etapas.append(
            Etapa(
                id=identificador,
                titulo=titulo,
                momento=momento,
                alvo=alvo,
                objetivo=meta.get("objetivo", ""),
                ativo=meta.get("ativo", "sim").strip().lower() not in {"nao", "não", "no", "false", "0"},
                corpo=corpo.strip("\n"),
            )
        )
    return etapas


PENDENTE = "a definir"


def campos_pendentes(etapa: "Etapa", config: dict) -> list[str]:
    """Chaves do config que a etapa usa e que ainda estão como 'a definir'."""
    usados = set(re.findall(r"{(\w+)}", etapa.corpo))
    return sorted(
        chave
        for chave in usados
        if str(config.get(chave, "")).strip().lower() == PENDENTE
    )


def montar_contexto(pedido: Pedido, config: dict) -> dict[str, str]:
    personalizacao = pedido.personalizacao.strip()
    ctx = {
        "nome": pedido.nome.strip(),
        "primeiro_nome": pedido.primeiro_nome,
        "tamanho": pedido.tamanho.strip() or "a confirmar",
        "personalizacao": personalizacao or "sem personalização",
        "personalizacao_frase": (
            f"*{personalizacao}*" if personalizacao else "sem personalização"
        ),
        "personalizacao_sufixo": f", {personalizacao}" if personalizacao else "",
        "instituto": pedido.instituto.strip() or "USP",
        "pagamento": pedido.pagamento.split(" - ")[0].strip() or "a confirmar",
        "valor": config["valor_social"] if pedido.e_social else config["valor_padrao"],
        "bloco_parcela": (
            "\nSobre o pagamento: seu pedido ficou como *Pix parcelado em 2x* e a 2ª parcela "
            "ainda está em aberto por aqui. Como o lote atrasou, *não precisa pagar agora* — "
            "você acerta a 2ª parcela *na hora da retirada*, quando o pedido chegar.\n"
            if pedido.parcela_em_aberto
            else ""
        ),
        "bloco_pagamento": (
            "\nLembrando: a 2ª parcela do seu Pix em 2x você acerta na hora da retirada.\n"
            if pedido.parcela_em_aberto
            else "\nAh, e falta finalizar o pagamento do seu pedido no crédito. "
            "Me chama por aqui que eu te passo como fazer, tá?\n"
            if pedido.pagamento_pendente
            else ""
        ),
        "pagamento_frase": (
            "com o pagamento no crédito ainda a finalizar"
            if pedido.pagamento_pendente
            else "com a 2ª parcela do Pix ainda em aberto"
            if pedido.parcela_em_aberto
            else "já pago e reservado no seu nome"
        ),
    }
    for chave, valor in config.items():
        ctx.setdefault(chave, str(valor))
    return ctx


class ContextoTolerante(dict):
    def __missing__(self, chave):  # placeholder desconhecido fica visível no texto
        return "{" + chave + "}"


def renderizar(etapa: Etapa, pedido: Pedido, config: dict) -> str:
    texto = etapa.corpo.format_map(ContextoTolerante(montar_contexto(pedido, config)))
    # blocos condicionais vazios não podem deixar buracos no meio da mensagem
    return re.sub(r"\n{3,}", "\n\n", texto).strip()


def link_whatsapp(telefone: str, mensagem: str) -> str:
    return f"https://wa.me/{telefone}?text={urllib.parse.quote(mensagem)}"


# ------------------------------------------------------------------------- saídas


def escrever_csvs(etapas, pedidos, config) -> dict[str, int]:
    contagem = {}
    gerados = {f"disparos_{e.id}.csv" for e in etapas}
    gerados |= {f"mensagens_{e.id}.txt" for e in etapas}
    for padrao in ("disparos_*.csv", "mensagens_*.txt"):  # não deixa fila de etapa fora do disparo
        for antigo in SAIDA.glob(padrao):
            if antigo.name not in gerados:
                antigo.unlink()
    for etapa in etapas:
        alvos = [p for p in pedidos if SEGMENTOS[etapa.alvo](p) and p.enviavel]
        contagem[etapa.id] = len(alvos)
        # .txt em UTF-8: rota de cópia manual que não depende do navegador nem do Excel
        with (SAIDA / f"mensagens_{etapa.id}.txt").open("w", encoding="utf-8") as txt:
            for pedido in alvos:
                txt.write(f"===== {pedido.nome} · +{pedido.telefone} =====\n")
                txt.write(renderizar(etapa, pedido, config) + "\n\n")
        destino = SAIDA / f"disparos_{etapa.id}.csv"
        with destino.open("w", encoding="utf-8", newline="") as fh:
            escritor = csv.writer(fh)
            escritor.writerow(["nome", "telefone_e164", "link_whatsapp", "mensagem", "enviado_em"])
            for pedido in alvos:
                mensagem = renderizar(etapa, pedido, config)
                escritor.writerow(
                    [pedido.nome, pedido.telefone, link_whatsapp(pedido.telefone, mensagem), mensagem, ""]
                )
    return contagem


def escrever_painel(etapas, pedidos, config, artifact: bool = False, titulo: str | None = None) -> None:
    """Escreve o painel de disparo.

    artifact=False -> painel.html, página completa para abrir no navegador.
    artifact=True  -> painel_celular.html, fragmento no formato exigido pelo Artifact do claude.ai
                      (sem <html>/<head>/<body>; título, meta e estilo no topo).
    """
    destino_alvo = "_blank" if artifact else "wa"  # no computador, reaproveita uma única aba do WhatsApp
    blocos = []
    for etapa in etapas:
        alvos = [p for p in pedidos if SEGMENTOS[etapa.alvo](p) and p.enviavel]
        cartoes = []
        for pedido in alvos:
            mensagem = renderizar(etapa, pedido, config)
            chave = f"{etapa.id}::{pedido.telefone}"
            cartoes.append(
                f"""      <li class="contato" data-chave="{html.escape(chave)}">
        <label><input type="checkbox" class="feito"> <b>{html.escape(pedido.nome.strip())}</b>
          <span class="meta">{html.escape(pedido.tamanho)} · {html.escape(pedido.instituto.strip())}</span></label>
        <div class="acoes">
          <a class="enviar" target="{destino_alvo}" href="{html.escape(link_whatsapp(pedido.telefone, mensagem))}">Abrir no WhatsApp</a>
          <button class="copiar" type="button">Copiar texto</button>
        </div>
        <details><summary>ver mensagem</summary><pre>{html.escape(mensagem)}</pre></details>
      </li>"""
            )
        pendentes = campos_pendentes(etapa, config)
        aviso = (
            '<p class="aviso">⚠ Não dispare ainda: preencha <code>'
            + "</code>, <code>".join(html.escape(c) for c in pendentes)
            + "</code> em <code>regua/config.json</code> e gere de novo.</p>"
            if pendentes
            else ""
        )
        blocos.append(
            f"""  <section class="etapa{' bloqueada' if pendentes else ''}" id="{html.escape(etapa.id)}">
    <h2>{html.escape(etapa.titulo)} <span class="tag">{html.escape(etapa.momento)}</span></h2>
    {aviso}
    <p class="objetivo">{html.escape(etapa.objetivo)}</p>
    <p class="contagem"><b>{len(alvos)}</b> contatos · segmento <code>{html.escape(etapa.alvo)}</code></p>
    <ul>
{chr(10).join(cartoes) if cartoes else '      <li class="vazio">Nenhum contato neste segmento.</li>'}
    </ul>
  </section>"""
        )

    indice = "".join(
        f'<a href="#{html.escape(e.id)}">{html.escape(e.titulo)}</a>' for e in etapas
    )
    titulo_pagina = titulo or f"Régua de comunicação — {config['produto']}"

    estilo = """
  /* Layout: barra fixa com o próximo contato no topo; abaixo, uma lista de cartões por etapa. */
  :root { --bg:#ffffff; --fg:#14181d; --linha:#dfe3e8; --suave:#58626d; --acento:#0b7a6d; --acento-fg:#ffffff;
          --chip:#f1f4f6; --aviso-bg:#ffd37a; --aviso-fg:#3a2600; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg:#12171c; --fg:#eef1f4; --linha:#2b3239; --suave:#98a3ae; --acento:#2fd36f;
          --acento-fg:#06281a; --chip:#1b2229; --aviso-bg:#5a4208; --aviso-fg:#ffe9b8; color-scheme: dark; }
  }
  :root[data-theme="dark"] { --bg:#12171c; --fg:#eef1f4; --linha:#2b3239; --suave:#98a3ae; --acento:#2fd36f;
          --acento-fg:#06281a; --chip:#1b2229; --aviso-bg:#5a4208; --aviso-fg:#ffe9b8; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; padding-block:16px; padding-left:max(16px, env(safe-area-inset-left, 0px));
         padding-right:max(16px, env(safe-area-inset-right, 0px)); background:var(--bg); color:var(--fg);
         font:16px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; }
  body::before { content:""; position:fixed; inset:0 0 auto; height:env(safe-area-inset-top, 0px);
                 z-index:10; background:var(--bg); }
  main { max-width:820px; margin:0 auto; }
  h1 { font-size:1.35rem; margin:0 0 4px; text-wrap:balance; }
  .sub { color:var(--suave); margin:0 0 16px; font-size:.95rem; }
  nav { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
  nav a { font-size:.85rem; padding:4px 10px; border:1px solid var(--linha); border-radius:999px;
          text-decoration:none; color:var(--fg); }
  .etapa { border-top:1px solid var(--linha); padding-top:16px; margin-top:24px; }
  h2 { font-size:1.1rem; margin:0 0 4px; }
  .tag { font-size:.75rem; color:var(--suave); font-weight:400; }
  .objetivo, .contagem { margin:0 0 8px; color:var(--suave); font-size:.9rem; }
  ul { list-style:none; padding:0; margin:0; }
  .contato { border:1px solid var(--linha); border-radius:10px; padding:10px 12px; margin-bottom:8px; min-width:0; }
  .contato.ok { opacity:.5; }
  .contato.proximo { outline:2px solid var(--acento); }
  .contato label { display:block; overflow-wrap:anywhere; }
  .meta { color:var(--suave); font-size:.85rem; }
  .acoes { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .botao, .enviar, .copiar, #fila button { font:inherit; font-size:.95rem; min-height:44px; padding:0 14px;
        display:inline-flex; align-items:center; justify-content:center; border-radius:8px; cursor:pointer;
        text-decoration:none; border:1px solid var(--linha); background:transparent; color:var(--fg); }
  .botao, .enviar { background:var(--acento); border-color:var(--acento); color:var(--acento-fg); font-weight:600; }
  .botao[aria-disabled="true"] { opacity:.5; pointer-events:none; }
  :is(a, button, summary):focus-visible { outline:3px solid var(--acento); outline-offset:2px; }
  details { margin-top:8px; }
  summary { cursor:pointer; color:var(--suave); font-size:.85rem; }
  pre { white-space:pre-wrap; overflow-wrap:anywhere; background:var(--chip); padding:10px; border-radius:8px;
        font:14px/1.5 ui-monospace, Menlo, monospace; }
  .vazio { color:var(--suave); font-size:.9rem; }
  #fila { position:sticky; top:env(safe-area-inset-top, 0px); z-index:9; display:flex; flex-wrap:wrap; gap:8px;
          align-items:center; background:var(--bg); border:1px solid var(--linha); border-radius:10px;
          padding:10px 12px; margin-bottom:16px; }
  #fila-txt { flex:1 1 100%; font-size:.95rem; min-width:0; overflow-wrap:anywhere; }
  #fila .botao { flex:1 1 auto; }
  .dica { font-size:.8rem; color:var(--suave); }
  @media (hover:none) { .dica { display:none; } }
  .aviso { background:var(--aviso-bg); color:var(--aviso-fg); padding:8px 12px; border-radius:8px;
           font-size:.9rem; margin:0 0 10px; }
  .aviso code { background:rgba(0,0,0,.15); padding:1px 4px; border-radius:4px; }
  .bloqueada .enviar { opacity:.5; }
"""

    corpo = f"""<main>
  <h1>{html.escape(titulo_pagina)}</h1>
  <p class="sub">Toque em “Abrir e marcar”: o WhatsApp abre com a mensagem pronta. Envie e volte para esta página. O progresso fica salvo neste aparelho.</p>
  <nav>{indice}</nav>
  <div id="fila">
    <span id="fila-txt">—</span>
    <a id="fila-btn" class="botao" target="{destino_alvo}" href="#">Abrir e marcar</a>
    <button id="fila-pular" type="button" title="Pular sem marcar">Pular</button>
    <button id="limpar" type="button" title="Desmarcar todos os enviados">Desmarcar todos</button>
    <span class="dica">Enter = abrir o próximo</span>
  </div>
{chr(10).join(blocos)}
</main>
<script>
  const CHAVE = 'regua-enviados';
  function lerGuardadas() {{ try {{ return JSON.parse(localStorage.getItem(CHAVE) || '{{}}'); }} catch (e) {{ return {{}}; }} }}
  function salvar(g) {{ try {{ localStorage.setItem(CHAVE, JSON.stringify(g)); }} catch (e) {{}} }}
  const guardadas = lerGuardadas();
  const contatos = [...document.querySelectorAll('.contato')];
  contatos.forEach(item => {{
    const caixa = item.querySelector('.feito');
    caixa.checked = !!guardadas[item.dataset.chave];
    item.classList.toggle('ok', caixa.checked);
    caixa.addEventListener('change', () => {{
      guardadas[item.dataset.chave] = caixa.checked;
      salvar(guardadas);
      item.classList.toggle('ok', caixa.checked);
      proximo();
    }});
  }});

  const fila = () => contatos.filter(i => !i.querySelector('.feito').checked && !i.dataset.pulado);
  const txt = document.getElementById('fila-txt');
  const btn = document.getElementById('fila-btn');
  function proximo() {{
    contatos.forEach(i => i.classList.remove('proximo'));
    const item = fila()[0];
    if (!item) {{
      txt.textContent = 'Fila concluída';
      btn.setAttribute('aria-disabled', 'true');
      btn.removeAttribute('href');
      return;
    }}
    item.classList.add('proximo');
    btn.href = item.querySelector('.enviar').href;
    btn.removeAttribute('aria-disabled');
    txt.textContent = 'Próximo: ' + item.querySelector('b').textContent + ' · faltam ' + fila().length;
  }}
  function marcar(item) {{
    const caixa = item.querySelector('.feito');
    caixa.checked = true;
    caixa.dispatchEvent(new Event('change'));
  }}
  // o link segue com o href atual; só depois da navegação a fila avança
  btn.addEventListener('click', e => {{
    const item = fila()[0];
    if (!item || btn.getAttribute('aria-disabled') === 'true') {{ e.preventDefault(); return; }}
    setTimeout(() => marcar(item), 0);
  }});
  document.getElementById('fila-pular').addEventListener('click', () => {{
    const item = fila()[0];
    if (item) {{ item.dataset.pulado = '1'; proximo(); }}
  }});
  contatos.forEach(item => item.querySelector('.enviar').addEventListener('click', () => {{
    const caixa = item.querySelector('.feito');
    if (!caixa.checked) setTimeout(() => marcar(item), 0);
  }}));
  proximo();
  window.addEventListener('focus', () => btn.focus());
  document.addEventListener('keydown', e => {{
    if (!['Enter', ' ', 'ArrowRight'].includes(e.key)) return;
    if (e.target.closest('button, a, input, textarea, summary')) return;  // o controle focado já reage sozinho
    e.preventDefault();
    btn.click();
  }});

  // confirmação dentro da página: confirm() não aparece no Artifact
  const limpar = document.getElementById('limpar');
  let armado = false, relogio = null;
  limpar.addEventListener('click', () => {{
    if (!armado) {{
      armado = true;
      limpar.textContent = 'Toque de novo para confirmar';
      relogio = setTimeout(() => {{ armado = false; limpar.textContent = 'Desmarcar todos'; }}, 4000);
      return;
    }}
    clearTimeout(relogio); armado = false; limpar.textContent = 'Desmarcar todos';
    contatos.forEach(i => {{
      delete i.dataset.pulado;
      const c = i.querySelector('.feito');
      if (c.checked) {{ c.checked = false; c.dispatchEvent(new Event('change')); }}
    }});
    proximo();
  }});

  // cópia: execCommand funciona em file://, a Clipboard API em páginas seguras, e por último o texto fica selecionado
  function selecionar(alvo) {{
    const cartao = alvo.closest('.contato');
    cartao.querySelector('details').open = true;
    const faixa = document.createRange();
    faixa.selectNodeContents(cartao.querySelector('pre'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    return 'Selecionado — copie';
  }}
  function copiarTexto(texto, alvo) {{
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {{ ok = document.execCommand('copy'); }} catch (e) {{ ok = false; }}
    document.body.removeChild(area);
    if (ok) return Promise.resolve('Copiado ✓');
    if (navigator.clipboard && navigator.clipboard.writeText) {{
      return navigator.clipboard.writeText(texto).then(() => 'Copiado ✓').catch(() => selecionar(alvo));
    }}
    return Promise.resolve(selecionar(alvo));
  }}
  document.querySelectorAll('.copiar').forEach(botao => botao.addEventListener('click', () => {{
    const texto = botao.closest('.contato').querySelector('pre').textContent;
    copiarTexto(texto, botao).then(msg => {{
      botao.textContent = msg;
      setTimeout(() => {{ botao.textContent = 'Copiar texto'; }}, 2500);
    }});
  }}));
</script>"""

    if artifact:
        pagina = (
            f"<title>{html.escape(titulo_pagina)}</title>\n"
            '<meta name="claude:viewport-fit-sides" content="cover">\n'
            f"<style>{estilo}</style>\n{corpo}\n"
        )
        nome = "painel_celular.html"
    else:
        pagina = (
            '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"<title>{html.escape(titulo_pagina)}</title>\n<style>{estilo}</style>\n</head>\n<body>\n{corpo}\n</body>\n</html>\n"
        )
        nome = "painel.html"
    (SAIDA / nome).write_text(pagina, encoding="utf-8")


def escrever_relatorio(etapas, pedidos, contagem) -> None:
    tamanhos = Counter(p.tamanho.strip() or "(vazio)" for p in pedidos)
    com_alerta = [p for p in pedidos if p.alertas]
    linhas = [
        "# Relatório da régua — Corta-vento G26",
        "",
        f"- Pedidos lidos: **{len(pedidos)}**",
        f"- Com telefone utilizável: **{sum(1 for p in pedidos if p.enviavel)}**",
        f"- Lote social: **{sum(1 for p in pedidos if p.e_social)}**"
        f" (pendentes de atestado: **{sum(1 for p in pedidos if p.social_pendente)}**)",
        f"- Pagamento em aberto (crédito): **{sum(1 for p in pedidos if p.pagamento_pendente)}**",
        f"- Pix parcelado em 2x: **{sum(1 for p in pedidos if p.parcelado)}**",
        f"- Com personalização: **{sum(1 for p in pedidos if p.personalizado)}**",
        "",
        "## Contatos por etapa",
        "",
        "| Etapa | Momento | Segmento | Contatos |",
        "| --- | --- | --- | --- |",
    ]
    for etapa in etapas:
        linhas.append(
            f"| {etapa.titulo} | {etapa.momento} | `{etapa.alvo}` | {contagem.get(etapa.id, 0)} |"
        )
    linhas += ["", "## Grade de tamanhos", "", "| Tamanho | Qtd |", "| --- | --- |"]
    for tamanho, qtd in sorted(tamanhos.items(), key=lambda kv: -kv[1]):
        linhas.append(f"| {tamanho} | {qtd} |")
    linhas += ["", "## Pendências a resolver antes de disparar", ""]
    if com_alerta:
        linhas += ["| Linha | Nome | Telefone | Pendência |", "| --- | --- | --- | --- |"]
        for p in com_alerta:
            linhas.append(
                f"| {p.linha} | {p.nome} | {p.telefone_bruto} | {'; '.join(p.alertas)} |"
            )
    else:
        linhas.append("Nenhuma pendência encontrada. 🎉")
    (SAIDA / "relatorio.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")


def main() -> None:
    global SAIDA
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv", type=Path, default=CSV_PADRAO, help="CSV exportado do Forms")
    parser.add_argument("--mensagens", type=Path, default=MENSAGENS, help="arquivo de textos das etapas")
    parser.add_argument("--config", type=Path, default=CONFIG, help="JSON com produto, valores e datas")
    parser.add_argument("--saida", type=Path, default=SAIDA, help="pasta de saída")
    parser.add_argument("--etapa", action="append", help="gera só as etapas informadas (pode repetir)")
    parser.add_argument(
        "--todas", action="store_true",
        help="inclui também as etapas marcadas como 'ativo: nao' (fora do disparo atual)",
    )
    args = parser.parse_args()

    SAIDA = args.saida
    config = json.loads(args.config.read_text(encoding="utf-8"))
    pedidos = ler_pedidos(args.csv)
    etapas = ler_etapas(args.mensagens)
    if not args.todas and not args.etapa:
        etapas = [e for e in etapas if e.ativo]
    if args.etapa:
        pedidas = set(args.etapa)
        etapas = [e for e in etapas if e.id in pedidas]
        if not etapas:
            raise SystemExit(f"Nenhuma etapa corresponde a {sorted(pedidas)}")

    SAIDA.mkdir(parents=True, exist_ok=True)
    contagem = escrever_csvs(etapas, pedidos, config)
    escrever_painel(etapas, pedidos, config)
    escrever_painel(etapas, pedidos, config, artifact=True, titulo=f"Retirada {config['produto']}")
    escrever_relatorio(etapas, pedidos, contagem)

    print(f"{len(pedidos)} pedidos · {len(etapas)} etapas")
    bloqueadas = []
    for etapa in etapas:
        pendentes = campos_pendentes(etapa, config)
        marca = "  ⚠ falta preencher: " + ", ".join(pendentes) if pendentes else ""
        if pendentes:
            bloqueadas.append(etapa)
        print(f"  {etapa.id:<22} {contagem.get(etapa.id, 0):>3} contatos  ({etapa.alvo}){marca}")
    if bloqueadas:
        nomes = ", ".join(e.id for e in bloqueadas)
        print(f"\n⚠ NÃO dispare {nomes} antes de preencher regua/config.json.")
    print(f"\nSaída em {SAIDA}/ — abra painel.html para disparar.")


if __name__ == "__main__":
    main()
