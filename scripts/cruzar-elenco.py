"""Cruza a tabela dos jogos com a filiação para montar a lista de inscritos.

Para cada jogo de uma modalidade, junta os atletas filiados que:
  1. pertencem a uma das atléticas da equipe (equipes combinadas contam todas);
  2. declararam essa modalidade na ficha de filiação;
  3. declararam o naipe da modalidade;
  4. estão regulares.

A saída alimenta a área do representante: ao escolher o jogo no scanner, a
conferência passa a ser contra quem pode jogar aquela partida, e não contra a
liga inteira.

Uso:
    python3 scripts/cruzar-elenco.py HM > data/elenco-HM.json
    python3 scripts/cruzar-elenco.py HM --resumo      # só as estatísticas

A saída tem nome e número USP dos atletas: trate como dado pessoal.
"""
import argparse
import json
import pathlib
import sys
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# Como a modalidade é escrita na ficha de filiação, por modalidade da tabela.
MODALIDADE_NA_FICHA = {
    "basquete": ["basquete", "basquetebol"],
    "futsal": ["futsal"],
    "futebol": ["futebol de campo", "futebol"],
    "handebol": ["handebol"],
    "volei": ["voleibol", "volei"],
    "tenis": ["tenis de campo"],
}

NAIPE = {"M": "masculino", "F": "feminino"}


def normalizar(texto):
    sem_acento = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in sem_acento if unicodedata.category(c) != "Mn").casefold().strip()


def atleticas_da_equipe(equipe):
    return [parte.strip().upper() for parte in (equipe or "").split("+") if parte.strip()]


def declarou(atleta, modalidade):
    esperadas = MODALIDADE_NA_FICHA.get(modalidade, [modalidade])
    declaradas = [normalizar(m) for m in atleta.get("modalidades") or []]
    return any(any(e in d for e in esperadas) for d in declaradas)


def elegivel(atleta, siglas, modalidade, genero):
    if atleta["atletica"].upper() not in siglas:
        return False
    if not declarou(atleta, modalidade):
        return False
    naipe = normalizar(atleta.get("naipe"))
    if naipe and NAIPE[genero] not in naipe:
        return False
    return True


def main():
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analisador.add_argument("modalidade", help="código da modalidade na tabela, ex.: HM")
    analisador.add_argument("--liga", default=str(RAIZ / "data" / "liga.json"))
    analisador.add_argument("--filiados", default=str(RAIZ / "data" / "filiados.json"))
    analisador.add_argument("--resumo", action="store_true",
                            help="imprime a cobertura por equipe em vez do JSON")
    args = analisador.parse_args()

    liga = json.loads(pathlib.Path(args.liga).read_text(encoding="utf-8"))
    filiados = json.loads(pathlib.Path(args.filiados).read_text(encoding="utf-8"))

    modalidade = next((m for m in liga["modalidades"] if m["id"] == args.modalidade.upper()), None)
    if not modalidade:
        sys.exit(f"modalidade {args.modalidade} não está em {args.liga}")

    equipes = sorted({e for j in modalidade["jogos"] for e in (j["equipeA"], j["equipeB"]) if e})
    elenco_por_equipe = {}
    for equipe in equipes:
        siglas = set(atleticas_da_equipe(equipe))
        elenco_por_equipe[equipe] = [
            {
                "nusp": a["nusp"],
                "nome": a["nome"],
                "atletica": a["atletica"],
                "codigoEcard": a.get("codigoEcard", ""),
                "situacao": a.get("situacao", "REGULAR"),
            }
            for a in filiados["atletas"]
            if elegivel(a, siglas, modalidade["modalidade"], modalidade["genero"])
        ]

    jogos = [
        {
            "codigo": j["codigo"],
            "data": j["data"],
            "hora": j["hora"],
            "local": j["local"],
            "equipeA": j["equipeA"],
            "equipeB": j["equipeB"],
            "inscritosA": len(elenco_por_equipe.get(j["equipeA"], [])),
            "inscritosB": len(elenco_por_equipe.get(j["equipeB"], [])),
        }
        for j in modalidade["jogos"]
    ]

    if args.resumo:
        print(f"{modalidade['nome']} — {len(modalidade['jogos'])} jogos, {len(equipes)} equipes")
        print(f"{'EQUIPE':<20} {'INSCRITOS':>9}")
        for equipe in equipes:
            print(f"{equipe:<20} {len(elenco_por_equipe[equipe]):>9}")
        vazias = [e for e in equipes if not elenco_por_equipe[e]]
        total = sum(len(v) for v in elenco_por_equipe.values())
        print(f"\ntotal de inscritos cruzados: {total}")
        print(f"equipes sem nenhum inscrito: {len(vazias)} de {len(equipes)}")
        if vazias:
            print("  " + ", ".join(vazias))
        return

    json.dump({
        "modalidade": modalidade["id"],
        "nome": modalidade["nome"],
        "temporada": liga.get("temporada"),
        "equipes": elenco_por_equipe,
        "jogos": jogos,
    }, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
