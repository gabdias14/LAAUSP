"""Cruza a tabela dos jogos com a filiação: quem pode jogar cada partida.

A regra é a do regulamento, não a da ficha de filiação. Pelo Artigo 7, quem joga
é o aluno com vínculo com a IES e filiação regular; pelo Artigo 8, § 1º, a
conferência que o representante faz na mesa "tem um caráter meramente de
conferência de filiação". Ou seja:

    pode jogar = filiado REGULAR de uma das atléticas que formam a equipe

A modalidade e o naipe declarados na ficha de filiação são intenção de competir,
não restrição: qualquer atleta filiado pode jogar qualquer modalidade. Eles
entram no relatório apenas como informação (o Artigo 10, § 2º manda o atleta
competir sempre pelo mesmo naipe, mas isso é consistência ao longo do ano, não
conferência de mesa).

O site não precisa deste arquivo: a área do representante faz o mesmo cruzamento
na hora, a partir da filiação. Este script serve para a organização ver a
cobertura antes da rodada e para exportar a lista de uma partida.

Uso:
    python3 scripts/cruzar-elenco.py HM --resumo          # cobertura por equipe
    python3 scripts/cruzar-elenco.py HM --jogo HM-14      # quem pode jogar a partida
    python3 scripts/cruzar-elenco.py HM > elenco-HM.json  # tudo, em JSON

A saída tem nome e número USP: trate como dado pessoal.
"""
import argparse
import json
import pathlib
import sys
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent

MODALIDADE_NA_FICHA = {
    "basquete": ["basquete", "basquetebol"],
    "futsal": ["futsal"],
    "futebol": ["futebol de campo", "futebol"],
    "handebol": ["handebol"],
    "volei": ["voleibol", "volei"],
    "tenis": ["tenis de campo"],
}

NAIPE = {"M": "masculino", "F": "feminino"}


def carregar_apelidos():
    """Siglas que a tabela dos jogos usa de forma diferente da filiação.

    A tabela escreve QUIM e RI; a filiação, QUÍMICA e IRI. O mapa vem de
    data/atleticas.json, gerado por scripts/parse-cores-atleticas.py.
    """
    caminho = RAIZ / "data" / "atleticas.json"
    if not caminho.exists():
        return {}
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return {normalizar(k): v for k, v in (dados.get("apelidos") or {}).items()}


def normalizar(texto):
    sem_acento = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in sem_acento if unicodedata.category(c) != "Mn").casefold().strip()


def atleticas_da_equipe(equipe, apelidos):
    """Uma equipe pode reunir até três atléticas (Artigo 6, § 2º)."""
    siglas = set()
    for parte in (equipe or "").split("+"):
        sigla = parte.strip().upper()
        if not sigla:
            continue
        siglas.add(normalizar(apelidos.get(normalizar(sigla), sigla)))
    return siglas


def declarou_modalidade(atleta, modalidade):
    esperadas = MODALIDADE_NA_FICHA.get(modalidade, [modalidade])
    declaradas = [normalizar(m) for m in atleta.get("modalidades") or []]
    return any(any(e in d for e in esperadas) for d in declaradas)


def regular(atleta):
    return (atleta.get("situacao") or "REGULAR").upper() == "REGULAR"


def pode_jogar(atleta, siglas):
    return normalizar(atleta["atletica"]) in siglas and regular(atleta)


def main():
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analisador.add_argument("modalidade", help="código da modalidade na tabela, ex.: HM")
    analisador.add_argument("--liga", default=str(RAIZ / "data" / "liga.json"))
    analisador.add_argument("--filiados", default=str(RAIZ / "data" / "filiados.json"))
    analisador.add_argument("--resumo", action="store_true", help="cobertura por equipe")
    analisador.add_argument("--jogo", help="lista os atletas de uma partida, ex.: HM-14")
    args = analisador.parse_args()

    liga = json.loads(pathlib.Path(args.liga).read_text(encoding="utf-8"))
    filiados = json.loads(pathlib.Path(args.filiados).read_text(encoding="utf-8"))

    modalidade = next((m for m in liga["modalidades"] if m["id"] == args.modalidade.upper()), None)
    if not modalidade:
        sys.exit(f"modalidade {args.modalidade} não está em {args.liga}")

    apelidos = carregar_apelidos()
    equipes = sorted({e for j in modalidade["jogos"] for e in (j["equipeA"], j["equipeB"]) if e})
    por_equipe = {}
    for equipe in equipes:
        siglas = atleticas_da_equipe(equipe, apelidos)
        por_equipe[equipe] = [
            {
                "nusp": a["nusp"],
                "nome": a["nome"],
                "atletica": a["atletica"],
                "codigoEcard": a.get("codigoEcard", ""),
                # Informativos: não valem como restrição para jogar.
                "naipe": a.get("naipe", ""),
                "declarouModalidade": declarou_modalidade(a, modalidade["modalidade"]),
            }
            for a in filiados["atletas"] if pode_jogar(a, siglas)
        ]

    if args.jogo:
        jogo = next((j for j in modalidade["jogos"] if j["codigo"] == args.jogo.upper()), None)
        if not jogo:
            sys.exit(f"jogo {args.jogo} não está na tabela de {modalidade['nome']}")
        print(f"{jogo['codigo']} · {jogo['equipeA']} x {jogo['equipeB']} · "
              f"{jogo['data']} {jogo['hora']} · {jogo['local']}")
        for equipe in (jogo["equipeA"], jogo["equipeB"]):
            aptos = por_equipe.get(equipe, [])
            declararam = sum(1 for a in aptos if a["declarouModalidade"])
            print(f"\n{equipe} — {len(aptos)} atleta(s) regular(es)"
                  f" · {declararam} declararam esta modalidade na filiação")
            for a in aptos[:40]:
                marca = "*" if a["declarouModalidade"] else " "
                print(f"  {marca} {a['nusp'] or '--------':>8}  {a['nome']}")
            if len(aptos) > 40:
                print(f"  … e mais {len(aptos) - 40}")
        return

    if args.resumo:
        print(f"{modalidade['nome']} — {len(modalidade['jogos'])} jogos, {len(equipes)} equipes")
        print(f"{'EQUIPE':<20} {'REGULARES':>9} {'DECLARARAM':>11}")
        for equipe in equipes:
            aptos = por_equipe[equipe]
            declararam = sum(1 for a in aptos if a["declarouModalidade"])
            print(f"{equipe:<20} {len(aptos):>9} {declararam:>11}")
        vazias = [e for e in equipes if not por_equipe[e]]
        print(f"\nequipes sem nenhum filiado regular: {len(vazias)} de {len(equipes)}")
        if vazias:
            print("  " + ", ".join(vazias))
        return

    json.dump({
        "modalidade": modalidade["id"],
        "nome": modalidade["nome"],
        "temporada": liga.get("temporada"),
        "regra": "filiado regular de uma das atléticas da equipe (Artigos 7 e 8 do regulamento)",
        "equipes": por_equipe,
        "jogos": [
            {
                "codigo": j["codigo"], "data": j["data"], "hora": j["hora"], "local": j["local"],
                "equipeA": j["equipeA"], "equipeB": j["equipeB"],
                "aptosA": len(por_equipe.get(j["equipeA"], [])),
                "aptosB": len(por_equipe.get(j["equipeB"], [])),
            }
            for j in modalidade["jogos"]
        ],
    }, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        # Acontece ao mandar a saída para `head` — não é erro.
        sys.stdout = None
