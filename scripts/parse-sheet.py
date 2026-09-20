"""Parser do export markdown da planilha pública da LAAUSP.

Gera public/data/liga.json a partir de um export em markdown da planilha
"[PÚBLICA] TABELA GERAL - JOGOS DA LIGA".
Uso: python3 scripts/parse-sheet.py <export.md> > public/data/liga.json
"""
import json
import re
import sys

STAT_LABELS = ["J", "P", "V", "E", "D", "G+", "G-", "P+", "P-", "SG", "SP",
               "MSG", "MSP", "MG+", "MG-", "MP+", "MP-", "MPD"]

SPORT_BY_CODE = {
    "BF": ("Basquete Feminino", "basquete", "F"),
    "BM": ("Basquete Masculino", "basquete", "M"),
    "FF": ("Futsal Feminino", "futsal", "F"),
    "FM": ("Futsal Masculino", "futsal", "M"),
    "HF": ("Handebol Feminino", "handebol", "F"),
    "HM": ("Handebol Masculino", "handebol", "M"),
    "VF": ("Vôlei Feminino", "volei", "F"),
    "VM": ("Vôlei Masculino", "volei", "M"),
    "FCM": ("Futebol de Campo Masculino", "futebol", "M"),
    "TCF": ("Tênis de Campo Feminino", "tenis", "F"),
    "TCM": ("Tênis de Campo Masculino", "tenis", "M"),
}


def clean(cell):
    c = cell.strip()
    c = c.replace("\\[merged\\]", " ")
    c = c.replace("\\-", "-").replace("\\#", "#").replace("\\!", "!")
    c = re.sub(r"\s+", " ", c).strip()
    if c in ("#REF!", ":-:", "-"):
        return ""
    return c


def rows_of(block):
    out = []
    for line in block.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [clean(c) for c in line.strip("|").split("|")]
        if all(c == "" for c in cells):
            out.append([])
            continue
        out.append(cells)
    return out


def at(row, i):
    return row[i] if 0 <= i < len(row) else ""


def first_non_empty(row, lo, hi):
    for i in range(lo, min(hi, len(row))):
        if row[i]:
            return row[i]
    return ""


def parse_matches(rows):
    """Extrai partidas de todos os blocos Local/Data/Hora/Código da aba."""
    matches = []
    for idx, row in enumerate(rows):
        try:
            c_local = row.index("Local")
            c_code = row.index("Código")
        except ValueError:
            continue
        if "Data" not in row or "Hora" not in row:
            continue
        c_data, c_hora = row.index("Data"), row.index("Hora")
        try:
            c_x = next(i for i in range(c_code + 1, len(row))
                       if row[i].lower() == "x")
        except StopIteration:
            continue
        for r in rows[idx + 1:]:
            if not r:
                break
            code = at(r, c_code)
            if not re.match(r"^[A-Z]{2,3}-\d+$", code):
                if at(r, c_local) or at(r, c_data):
                    continue
                break
            matches.append({
                "codigo": code,
                "local": at(r, c_local),
                "data": at(r, c_data),
                "hora": at(r, c_hora),
                "equipeA": first_non_empty(r, c_code + 1, c_x - 1),
                "placarA": at(r, c_x - 1),
                "equipeB": first_non_empty(r, c_x + 2, c_x + 5),
                "placarB": at(r, c_x + 1),
            })
    return matches


def parse_standings(rows):
    """Extrai a classificação geral e a classificação por grupo."""
    geral, grupos = [], []
    for idx, row in enumerate(rows):
        anchors = [i for i, c in enumerate(row)
                   if c == "EQUIPES" or c.startswith("Grupo")]
        for anchor in anchors:
            stats = []
            for i in range(anchor + 1, len(row)):
                if row[i] in STAT_LABELS:
                    stats.append((i, row[i]))
                elif stats:
                    break
            if len(stats) < 4:
                continue
            team_col = stats[0][0] - 1
            table = []
            for r in rows[idx + 1:]:
                if not r:
                    break
                team = at(r, team_col)
                if not team or team.startswith("Grupo") or team == "EQUIPES":
                    if any(at(r, i) for i, _ in stats):
                        continue
                    break
                entry = {"equipe": team}
                for i, label in stats:
                    entry[label] = at(r, i)
                table.append(entry)
            if not table:
                continue
            if row[anchor] == "EQUIPES":
                geral = geral or table
            else:
                grupos.append({"nome": row[anchor], "tabela": table})
    # cabeçalhos mesclados repetem o mesmo grupo várias vezes
    unicos, vistos = [], set()
    for g in grupos:
        chave = (g["nome"], tuple(t["equipe"] for t in g["tabela"]))
        if chave in vistos:
            continue
        vistos.add(chave)
        unicos.append(g)
    return geral, unicos


def parse_rounds(blocks):
    """Mapeia código do jogo -> rodada/dia, a partir das abas de calendário."""
    info = {}
    for block in blocks:
        for row in rows_of(block):
            if not row:
                continue
            rodada = next((c for c in row if re.match(r"^\d+ª Rodada$", c)), "")
            dia = next((c for c in row if c in (
                "Segunda", "Terça", "Quarta", "Quinta",
                "Sexta", "Sábado", "Domingo")), "")
            for c in row:
                if re.match(r"^[A-Z]{2,3}-\d+$", c):
                    entry = info.setdefault(c, {})
                    if rodada:
                        entry["rodada"] = rodada
                    if dia:
                        entry["dia"] = dia
    return info


def main():
    text = open(sys.argv[1], encoding="utf-8").read()
    blocks = [b for b in text.split("\n\n") if b.strip()]
    rounds = parse_rounds(blocks)

    sports = {}
    for block in blocks:
        rows = rows_of(block)
        matches = parse_matches(rows)
        if not matches:
            continue
        prefix = matches[0]["codigo"].split("-")[0]
        if prefix not in SPORT_BY_CODE:
            continue
        nome, modalidade, genero = SPORT_BY_CODE[prefix]
        geral, grupos = parse_standings(rows)
        entry = sports.setdefault(prefix, {
            "id": prefix, "nome": nome, "modalidade": modalidade,
            "genero": genero, "jogos": [], "classificacaoGeral": [],
            "grupos": [],
        })
        seen = {j["codigo"] for j in entry["jogos"]}
        for m in matches:
            if m["codigo"] in seen:
                continue
            seen.add(m["codigo"])
            m.update(rounds.get(m["codigo"], {}))
            m["modalidade"] = prefix
            entry["jogos"].append(m)
        if geral and not entry["classificacaoGeral"]:
            entry["classificacaoGeral"] = geral
        if grupos and not entry["grupos"]:
            entry["grupos"] = grupos

    out = {
        "fonte": "https://docs.google.com/spreadsheets/d/"
                 "1xVSMcugSbGGE2-QiPbOJJF1oLZkGpt--MnFXKczq3vU/edit",
        "temporada": "2026",
        "modalidades": list(sports.values()),
    }
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
