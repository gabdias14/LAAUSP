"""Lê as cores oficiais de cada atlética direto do PLANILHÃO.

Cada aba "<SIGLA>" do arquivo [2026] PLANILHÃO - ATLETAS REGULARES tem o título
na linha 1 pintado com as cores da atlética: o preenchimento é a cor primária e
a cor da fonte é a secundária. É de lá que vêm as cores usadas no site.

Uso:
    # baixe a planilha como .xlsx (Arquivo → Fazer download → Microsoft Excel)
    python3 scripts/parse-cores-atleticas.py planilhao.xlsx > data/atleticas.json
"""
import json
import sys

import openpyxl

ABAS_IGNORADAS = {"HOME", "TOTAL", "ATL EXCEÇÃO"}

# Unidades da USP a que cada atlética está ligada, para exibir na carteirinha.
UNIDADES = {
    "EACH": "Escola de Artes, Ciências e Humanidades",
    "ECA": "Escola de Comunicações e Artes",
    "EDUCA": "Faculdade de Educação",
    "EEFE": "Escola de Educação Física e Esporte",
    "EEL": "Escola de Engenharia de Lorena",
    "ENF": "Escola de Enfermagem",
    "FARMA": "Faculdade de Ciências Farmacêuticas",
    "FAU": "Faculdade de Arquitetura e Urbanismo",
    "FEA": "Faculdade de Economia, Administração e Contabilidade",
    "FFLCH": "Faculdade de Filosofia, Letras e Ciências Humanas",
    "FOFITO": "Fonoaudiologia, Fisioterapia e Terapia Ocupacional",
    "FSP": "Faculdade de Saúde Pública",
    "GEO": "Instituto de Geociências",
    "ICBIÓ": "Instituto de Ciências Biomédicas",
    "IME": "Instituto de Matemática e Estatística",
    "IRI": "Instituto de Relações Internacionais",
    "MED": "Faculdade de Medicina",
    "ODONTO": "Faculdade de Odontologia",
    "POLI": "Escola Politécnica",
    "PSICO": "Instituto de Psicologia",
    "QUÍMICA": "Instituto de Química",
    "SANFRAN": "Faculdade de Direito (Largo São Francisco)",
    "VET": "Faculdade de Medicina Veterinária e Zootecnia",
}

# Siglas usadas nas tabelas dos jogos que apontam para a mesma atlética.
APELIDOS = {
    "QUIM": "QUÍMICA",
    "QUIMICA": "QUÍMICA",
    "RI": "IRI",
    "ICBIO": "ICBIÓ",
    "GW": "AAAGW",
}


def cor(valor, padrao):
    """Converte o ARGB do openpyxl em hexadecimal CSS."""
    if not isinstance(valor, str) or len(valor) < 6:
        return padrao
    return f"#{valor[-6:].lower()}"


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    planilha = openpyxl.load_workbook(sys.argv[1])

    atleticas = []
    for aba in planilha.worksheets:
        if aba.title in ABAS_IGNORADAS:
            continue
        titulo = aba["B1"]
        primaria = cor(titulo.fill.fgColor.rgb if titulo.fill else None, "#142156")
        secundaria = cor(titulo.font.color.rgb if titulo.font and titulo.font.color else None, "#ffffff")
        atleticas.append({
            "sigla": aba.title,
            "unidade": UNIDADES.get(aba.title, ""),
            "corPrimaria": primaria,
            "corSecundaria": secundaria,
        })

    json.dump({
        "fonte": "Cores lidas do cabeçalho de cada aba do PLANILHÃO - ATLETAS REGULARES.",
        "apelidos": APELIDOS,
        "atleticas": atleticas,
    }, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
