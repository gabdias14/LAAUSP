"""Gera as carteirinhas da LAAUSP para a Apple Wallet e para o Google Wallet.

Os dois formatos exigem assinatura com uma chave privada da liga, o que não pode
ser feito no navegador. Por isso os passes são gerados em lote aqui e publicados
como arquivos estáticos: o site só precisa apontar para eles
(WALLET_APPLE_BASE e WALLET_GOOGLE_BASE em assets/js/config.js).

O que é preciso ter antes:

  Apple Wallet (.pkpass)
    - conta no Apple Developer Program (US$ 99/ano);
    - um Pass Type ID e o certificado dele, exportado em .pem junto da chave;
    - o certificado intermediário da Apple (AppleWWDRCAG4.pem).

  Google Wallet (link "Salvar no Google Wallet")
    - conta de emissor no Google Wallet Console (gratuita);
    - uma chave de conta de serviço em JSON, com a API Google Wallet liberada.

Exemplos:

    python3 scripts/gerar-wallet.py --filiados data/filiados.json \\
        --saida documentos/wallet \\
        --apple-pass-type pass.br.com.laausp.carteirinha \\
        --apple-team ABCDE12345 \\
        --apple-cert certificados/pass.pem \\
        --apple-wwdr certificados/AppleWWDRCAG4.pem

    python3 scripts/gerar-wallet.py --filiados data/filiados.json \\
        --saida documentos/wallet \\
        --google-conta certificados/service-account.json \\
        --google-emissor 3388000000022000000 \\
        --google-classe carteirinha_2026

A saída tem um arquivo por atleta, nomeado pelo número USP:
<numeroUSP>.pkpass e <numeroUSP>.txt (o link do Google Wallet).

ATENÇÃO: a pasta de saída contém dados pessoais dos atletas. Publique apenas o
que for necessário e nunca a versione no git.
"""
import argparse
import base64
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
import time
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ARQUIVOS_DO_PASSE = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png"]

NAVY = "rgb(20, 33, 86)"
LARANJA = "rgb(239, 138, 60)"


def carregar_atletas(caminho, temporada_padrao="2026"):
    dados = json.loads(pathlib.Path(caminho).read_text(encoding="utf-8"))
    temporada = str(dados.get("temporada") or temporada_padrao)
    atletas = [a for a in dados["atletas"] if a.get("nusp")]
    return temporada, atletas


def carregar_atleticas():
    caminho = RAIZ / "data" / "atleticas.json"
    if not caminho.exists():
        return {}
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return {a["sigla"]: a for a in dados["atleticas"]}


def payload(atleta, temporada):
    """Mesmo conteúdo do QR da carteirinha na tela, para um scanner só."""
    return f"LAAUSP|{temporada}|{atleta['nusp']}"


def pass_json(atleta, atletica, temporada, args):
    regular = (atleta.get("situacao") or "").upper() == "REGULAR"
    return {
        "formatVersion": 1,
        "passTypeIdentifier": args.apple_pass_type,
        "teamIdentifier": args.apple_team,
        "serialNumber": f"{temporada}-{atleta['nusp']}",
        "organizationName": "LAAUSP",
        "description": f"Carteirinha LAAUSP {temporada}",
        "logoText": "LAAUSP",
        "backgroundColor": NAVY,
        "foregroundColor": "rgb(255, 255, 255)",
        "labelColor": LARANJA,
        "barcodes": [{
            "format": "PKBarcodeFormatQR",
            "message": payload(atleta, temporada),
            "messageEncoding": "iso-8859-1",
            "altText": atleta["nusp"],
        }],
        "generic": {
            "headerFields": [
                {"key": "temporada", "label": "TEMPORADA", "value": temporada},
            ],
            "primaryFields": [
                {"key": "nome", "label": "ATLETA", "value": atleta["nome"]},
            ],
            "secondaryFields": [
                {"key": "atletica", "label": "ATLÉTICA", "value": atleta["atletica"]},
                {"key": "nusp", "label": "Nº USP", "value": atleta["nusp"]},
            ],
            "auxiliaryFields": [
                {"key": "situacao", "label": "SITUAÇÃO",
                 "value": "Regular" if regular else (atleta.get("situacao") or "Irregular").title()},
                {"key": "vinculo", "label": "VÍNCULO", "value": atleta.get("vinculo") or "—"},
            ],
            "backFields": [
                {"key": "unidade", "label": "Unidade", "value": atletica.get("unidade") or atleta["atletica"]},
                {"key": "modalidades", "label": "Modalidades",
                 "value": ", ".join(atleta.get("modalidades") or []) or "—"},
                {"key": "validade", "label": "Validade", "value": f"31/12/{temporada}"},
                {"key": "aviso", "label": "Conferência",
                 "value": "Apresente este código ao representante na mesa. "
                          "A situação da filiação é conferida no momento da leitura."},
            ],
        },
    }


def assinar_manifesto(manifesto, args, destino):
    """Assinatura PKCS#7 destacada, como a Apple exige."""
    comando = [
        "openssl", "smime", "-binary", "-sign",
        "-certfile", str(args.apple_wwdr),
        "-signer", str(args.apple_cert),
        "-inkey", str(args.apple_key or args.apple_cert),
        "-in", str(manifesto),
        "-out", str(destino),
        "-outform", "DER",
    ]
    if args.apple_senha:
        comando += ["-passin", f"pass:{args.apple_senha}"]
    resultado = subprocess.run(comando, capture_output=True, text=True)
    if resultado.returncode != 0:
        raise RuntimeError(f"openssl falhou ao assinar: {resultado.stderr.strip()}")


def gerar_pkpass(atleta, atletica, temporada, args, saida):
    with tempfile.TemporaryDirectory() as pasta:
        pasta = pathlib.Path(pasta)
        conteudo = {"pass.json": json.dumps(
            pass_json(atleta, atletica, temporada, args), ensure_ascii=False, indent=2
        ).encode("utf-8")}
        for nome in ARQUIVOS_DO_PASSE:
            origem = RAIZ / "assets" / "wallet" / nome
            if origem.exists():
                conteudo[nome] = origem.read_bytes()

        manifesto = {nome: hashlib.sha1(dados).hexdigest() for nome, dados in conteudo.items()}
        caminho_manifesto = pasta / "manifest.json"
        caminho_manifesto.write_bytes(json.dumps(manifesto, indent=2).encode("utf-8"))

        caminho_assinatura = pasta / "signature"
        assinar_manifesto(caminho_manifesto, args, caminho_assinatura)

        destino = saida / f"{atleta['nusp']}.pkpass"
        with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as pacote:
            for nome, dados in conteudo.items():
                pacote.writestr(nome, dados)
            pacote.writestr("manifest.json", caminho_manifesto.read_bytes())
            pacote.writestr("signature", caminho_assinatura.read_bytes())
        return destino


def base64url(dados):
    return base64.urlsafe_b64encode(dados).decode("ascii").rstrip("=")


def assinar_jwt(cabecalho, corpo, chave_pem):
    entrada = f"{base64url(json.dumps(cabecalho).encode())}.{base64url(json.dumps(corpo).encode()) }".encode()
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as arquivo_chave:
        arquivo_chave.write(chave_pem)
        caminho_chave = arquivo_chave.name
    try:
        resultado = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", caminho_chave],
            input=entrada, capture_output=True)
        if resultado.returncode != 0:
            raise RuntimeError(f"openssl falhou ao assinar o JWT: {resultado.stderr.decode().strip()}")
        return f"{entrada.decode()}.{base64url(resultado.stdout)}"
    finally:
        pathlib.Path(caminho_chave).unlink(missing_ok=True)


def objeto_google(atleta, atletica, temporada, args):
    regular = (atleta.get("situacao") or "").upper() == "REGULAR"
    return {
        "id": f"{args.google_emissor}.{temporada}-{atleta['nusp']}",
        "classId": f"{args.google_emissor}.{args.google_classe}",
        "state": "ACTIVE",
        "hexBackgroundColor": "#142156",
        "cardTitle": {"defaultValue": {"language": "pt-BR", "value": "LAAUSP"}},
        "header": {"defaultValue": {"language": "pt-BR", "value": atleta["nome"]}},
        "subheader": {"defaultValue": {"language": "pt-BR", "value": f"{atleta['atletica']} · {temporada}"}},
        "barcode": {"type": "QR_CODE", "value": payload(atleta, temporada), "alternateText": atleta["nusp"]},
        "textModulesData": [
            {"id": "nusp", "header": "Nº USP", "body": atleta["nusp"]},
            {"id": "situacao", "header": "Situação",
             "body": "Atleta regular" if regular else (atleta.get("situacao") or "Irregular").title()},
            {"id": "unidade", "header": "Unidade",
             "body": atletica.get("unidade") or atleta["atletica"]},
            {"id": "modalidades", "header": "Modalidades",
             "body": ", ".join(atleta.get("modalidades") or []) or "—"},
            {"id": "validade", "header": "Validade", "body": f"31/12/{temporada}"},
        ],
    }


def gerar_link_google(atleta, atletica, temporada, args, conta, saida):
    corpo = {
        "iss": conta["client_email"],
        "aud": "google",
        "typ": "savetowallet",
        "iat": int(time.time()),
        "origins": args.google_origens,
        "payload": {"genericObjects": [objeto_google(atleta, atletica, temporada, args)]},
    }
    jwt = assinar_jwt({"alg": "RS256", "typ": "JWT"}, corpo, conta["private_key"])
    destino = saida / f"{atleta['nusp']}.txt"
    destino.write_text(f"https://pay.google.com/gp/v/save/{jwt}\n", encoding="utf-8")
    return destino


def main():
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analisador.add_argument("--filiados", default="data/filiados.json")
    analisador.add_argument("--saida", default="documentos/wallet")
    analisador.add_argument("--limite", type=int, help="gera apenas os N primeiros, para testar")
    analisador.add_argument("--apple-pass-type")
    analisador.add_argument("--apple-team")
    analisador.add_argument("--apple-cert", type=pathlib.Path)
    analisador.add_argument("--apple-key", type=pathlib.Path,
                            help="omita se a chave estiver no mesmo .pem do certificado")
    analisador.add_argument("--apple-wwdr", type=pathlib.Path)
    analisador.add_argument("--apple-senha", help="senha da chave privada, se houver")
    analisador.add_argument("--google-conta", type=pathlib.Path)
    analisador.add_argument("--google-emissor")
    analisador.add_argument("--google-classe", default="carteirinha")
    analisador.add_argument("--google-origens", nargs="*", default=[])
    args = analisador.parse_args()

    faz_apple = all([args.apple_pass_type, args.apple_team, args.apple_cert, args.apple_wwdr])
    faz_google = all([args.google_conta, args.google_emissor])
    if not faz_apple and not faz_google:
        analisador.error("informe os dados da Apple, do Google, ou dos dois — "
                         "veja os exemplos no começo do arquivo")

    temporada, atletas = carregar_atletas(args.filiados)
    if args.limite:
        atletas = atletas[:args.limite]
    atleticas = carregar_atleticas()

    saida = pathlib.Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)

    conta = json.loads(args.google_conta.read_text(encoding="utf-8")) if faz_google else None

    gerados = 0
    for atleta in atletas:
        atletica = atleticas.get(atleta["atletica"], {})
        try:
            if faz_apple:
                gerar_pkpass(atleta, atletica, temporada, args, saida)
            if faz_google:
                gerar_link_google(atleta, atletica, temporada, args, conta, saida)
            gerados += 1
        except Exception as erro:  # um atleta com problema não derruba o lote
            print(f"[erro] {atleta['nusp']} {atleta['nome']}: {erro}", file=sys.stderr)

    print(f"{gerados} de {len(atletas)} carteirinha(s) geradas em {saida}")
    if faz_apple:
        print("Publique os .pkpass e aponte WALLET_APPLE_BASE para a pasta.")
    if faz_google:
        print("Publique os .txt e aponte WALLET_GOOGLE_BASE para a pasta.")


if __name__ == "__main__":
    main()
