#!/usr/bin/env python3
"""Monta a planilha de controle do disparo: quem recebeu a mensagem e o status de cada pedido.

Cruza dados/pedidos.csv (a base de vendas) com dados/status.csv (as exceções
anotadas à mão) e escreve saida/controle_envio.csv, pronto para colar como aba
na planilha VENDAS - CORTA-VENTO G26.

Quem não aparece em status.csv entra como "Enviada", com o status derivado do
próprio pedido (parcela na retirada, crédito em aberto, atestado pendente).

Uso: python3 scripts/gerar_controle.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar_regua import CSV_PADRAO, RAIZ, SAIDA, Pedido, ler_pedidos, sem_acento

STATUS = RAIZ / "dados" / "status.csv"
ETAPA = "Aviso de atraso (5b)"


def chave(nome: str) -> str:
    return " ".join(sem_acento(nome).lower().split())


def ler_excecoes(caminho: Path) -> dict[str, dict[str, str]]:
    if not caminho.exists():
        return {}
    with caminho.open(encoding="utf-8-sig", newline="") as fh:
        return {chave(linha["nome"]): linha for linha in csv.DictReader(fh)}


def status_padrao(pedido: Pedido) -> tuple[str, str]:
    """Status e pendência derivados do próprio pedido, para quem não tem exceção."""
    if pedido.pagamento_pendente:
        return "Pagamento no crédito não finalizado", "Chamar para fechar a compra"
    if pedido.parcelado:
        return "2ª parcela na retirada", "Receber a 2ª parcela na entrega"
    if pedido.social_pendente:
        return "Lote social sem atestado", "Cobrar o atestado de matrícula"
    return "Em dia", ""


def main() -> None:
    pedidos = ler_pedidos(CSV_PADRAO)
    excecoes = ler_excecoes(STATUS)
    usadas = set()

    SAIDA.mkdir(exist_ok=True)
    destino = SAIDA / "controle_envio.csv"
    with destino.open("w", encoding="utf-8", newline="") as fh:
        escritor = csv.writer(fh)
        escritor.writerow(
            ["Nome", "Telefone", "Tamanho", "Personalização", "Pagamento",
             "Lote social", f"Mensagem — {ETAPA}", "Status", "Pendência", "Observação"]
        )
        for pedido in pedidos:
            excecao = excecoes.get(chave(pedido.nome))
            if excecao:
                usadas.add(chave(pedido.nome))
            status, pendencia = status_padrao(pedido)
            escritor.writerow([
                pedido.nome.strip(),
                pedido.telefone_bruto.strip(),
                pedido.tamanho.strip(),
                pedido.personalizacao.strip() or "-",
                pedido.pagamento.split(" - ")[0].strip(),
                "Sim" if pedido.e_social else "Não",
                excecao["envio"] if excecao else "Enviada",
                excecao["status"] if excecao else status,
                "" if excecao else pendencia,
                excecao["observacao"] if excecao else "; ".join(pedido.alertas),
            ])

    orfas = sorted(set(excecoes) - usadas)
    print(f"{len(pedidos)} linhas em {destino}")
    if orfas:
        print("⚠ nomes em status.csv sem par na base:", ", ".join(orfas))


if __name__ == "__main__":
    main()
