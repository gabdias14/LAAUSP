"""Converte os exports das planilhas de filiação em data/filiados.json.

Aceita os dois formatos usados pela LAAUSP:

* PLANILHÃO — abas "<SIGLA> ATLETAS REGULARES" com
  FACULDADE | NOME | VINCULO | REGULADO?
* FILIAÇÃO DA ATLÉTICA — respostas do formulário, com número USP, e-mail,
  vínculo, naipe, modalidades e a conferência da LAAUSP.

O CPF presente no formulário é descartado de propósito: a carteirinha não
precisa dele e ele não deve sair da planilha original.

Uso:
    python3 scripts/parse-filiados.py export1.md [export2.md ...] > data/filiados.json
"""
import json
import re
import sys

CABECALHO_PLANILHAO = ["FACULDADE", "NOME", "VINCULO", "REGULADO?"]


def clean(cell):
    c = cell.strip().replace("\\[merged\\]", " ")
    c = re.sub(r"\\(.)", r"\1", c)
    c = re.sub(r"\s+", " ", c).strip()
    return "" if c in (":-:", "#N/A", "#REF!", "-") else c


def linhas_de(texto):
    for linha in texto.split("\n"):
        linha = linha.strip()
        if not linha.startswith("|"):
            yield None
            continue
        yield [clean(c) for c in linha.strip("|").split("|")]


def indice_de(cabecalho, *pedacos):
    """Acha a coluna cujo título contém um dos pedaços informados."""
    for i, titulo in enumerate(cabecalho):
        alvo = titulo.upper()
        if any(p.upper() in alvo for p in pedacos):
            return i
    return -1


def normalizar_nome(nome):
    # O formulário pede *** no fim para indicar nome social.
    return re.sub(r"\*+\s*$", "", re.sub(r"^\s*\*+", "", nome)).strip()


def parse(texto):
    atletas = []
    cabecalho = None
    colunas = {}
    for linha in linhas_de(texto):
        if linha is None:
            cabecalho = None
            continue

        celulas = [c for c in linha if c]
        if not celulas:
            continue

        if all(t in linha for t in CABECALHO_PLANILHAO):
            cabecalho = "planilhao"
            colunas = {
                "atletica": linha.index("FACULDADE"),
                "nome": linha.index("NOME"),
                "vinculo": linha.index("VINCULO"),
                "situacao": linha.index("REGULADO?"),
            }
            continue

        if indice_de(linha, "NOME COMPLETO") >= 0 and indice_de(linha, "NÚMERO USP", "NUMERO USP") >= 0:
            cabecalho = "filiacao"
            colunas = {
                "atletica": indice_de(linha, "FACULDADE"),
                "nome": indice_de(linha, "NOME COMPLETO"),
                "nusp": indice_de(linha, "NÚMERO USP", "NUMERO USP"),
                "email": indice_de(linha, "E-MAIL", "EMAIL"),
                "vinculo": indice_de(linha, "VÍNCULO", "VINCULO"),
                "naipe": indice_de(linha, "NAIPE"),
                "modalidades": indice_de(linha, "MODALIDADES"),
                "pagamento": indice_de(linha, "PAGO?"),
                "situacao": indice_de(linha, "CONFERIDO LAAUSP"),
            }
            continue

        if not cabecalho:
            continue

        pegar = lambda chave: (linha[colunas[chave]]
                               if colunas.get(chave, -1) >= 0 and colunas[chave] < len(linha)
                               else "")
        nome = normalizar_nome(pegar("nome"))
        atletica = pegar("atletica").upper()
        if not nome or not atletica or nome.upper() == "NOME":
            continue

        atleta = {
            "atletica": atletica,
            "nome": nome,
            "nusp": re.sub(r"\D", "", pegar("nusp")),
            "email": pegar("email"),
            "vinculo": pegar("vinculo"),
            "naipe": pegar("naipe"),
            "modalidades": [m.strip() for m in pegar("modalidades").split(",") if m.strip()],
            "situacao": pegar("situacao").upper() or "REGULAR",
            "pagamento": pegar("pagamento"),
        }
        atletas.append(atleta)
    return atletas


def mesclar(atletas):
    """Junta as duas fontes: o formulário traz o número USP, o planilhão a situação."""
    por_chave = {}
    for atleta in atletas:
        chave = atleta["nusp"] or f"{atleta['atletica']}:{atleta['nome'].casefold()}"
        atual = por_chave.get(chave)
        if not atual:
            por_chave[chave] = atleta
            continue
        for campo, valor in atleta.items():
            if valor and not atual.get(campo):
                atual[campo] = valor
        # IRREGULAR sempre prevalece sobre REGULAR.
        if "IRREGULAR" in (atleta["situacao"], atual["situacao"]):
            atual["situacao"] = "IRREGULAR"
    return sorted(por_chave.values(), key=lambda a: (a["atletica"], a["nome"].casefold()))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    atletas = []
    for caminho in sys.argv[1:]:
        atletas += parse(open(caminho, encoding="utf-8").read())
    atletas = mesclar(atletas)
    json.dump({
        "temporada": "2026",
        "geradoEm": None,
        "total": len(atletas),
        "atletas": atletas,
    }, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
