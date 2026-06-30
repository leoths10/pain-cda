#!/usr/bin/env python3
"""
Récupère via SFTP (jump host → VM cible) le contenu d'un ou plusieurs scripts
shell référencés dans le plan VTOM.

Le JSON VTOM est lu depuis stdin (envoyé par le contrôleur PHP depuis le cache).

Règles de résolution des chemins :
  '#/app/foo.sh'  → retire le '#'            → /app/foo.sh
  '/app/foo.sh'   → chemin absolu             → /app/foo.sh
  'foo.sh'        → concaténé avec scriptsDir → <scriptsDir>/foo.sh

Variables d'environnement requises :
  JUMP_HOST, JUMP_PORT, JUMP_USERNAME, JUMP_PASSWORD
  TARGET_HOST, TARGET_PORT, TARGET_USERNAME, TARGET_PASSWORD

Variable optionnelle :
  FETCH_SINGLE_SCRIPT  chemin brut d'un script unique

Sortie JSON (stdout) :
  {
    "scriptsDir":    "/app/pay/scripts/batchslr/",
    "fetched":       { "<chemin>": "<contenu>", ... },
    "errors":        { "<chemin>": "<message>", ... },
    "skipped":       ["<chemin_non_résolu>", ...],
    "chaine_batch":  { "<chemin>": ["VAL1", "VAL2"], ... }
  }
"""

import json
import os
import re
import socket
import sys

try:
    import paramiko
except ImportError:
    print(json.dumps({
        "error": "Dépendance manquante",
        "message": "pip install paramiko",
    }), file=sys.stderr)
    sys.exit(1)

SSH_CONNECT_TIMEOUT = 15

# Regex CHAINE_BATCH : ligne commençant par CHAINE_BATCH= (hors espaces),
# capture tout jusqu'à la fin de la ligne. Gère les guillemets simples/doubles.
_RE_CHAINE_BATCH = re.compile(r'^\s*CHAINE_BATCH=["\']?([^"\';\n]+)', re.MULTILINE)

REQUIRED_SSH_VARS = [
    'JUMP_HOST', 'JUMP_USERNAME', 'JUMP_PASSWORD',
    'TARGET_HOST', 'TARGET_USERNAME', 'TARGET_PASSWORD',
]


# ---------------------------------------------------------------------------
# SSH
# ---------------------------------------------------------------------------

def build_ssh_tunnel(jump_host, jump_port, jump_user, jump_password,
                     target_host, target_port, target_user, target_password):
    """
    Ouvre une connexion SSH double-hop : machine locale → jump host → VM cible.
    Retourne (jump_client, target_client).
    """
    jump = paramiko.SSHClient()
    jump.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    jump.connect(hostname=jump_host, port=jump_port,
                 username=jump_user, password=jump_password,
                 timeout=SSH_CONNECT_TIMEOUT)

    channel = jump.get_transport().open_channel(
        'direct-tcpip', (target_host, target_port), ('127.0.0.1', 0)
    )

    target = paramiko.SSHClient()
    target.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    target.connect(hostname=target_host, port=target_port,
                   username=target_user, password=target_password,
                   sock=channel, timeout=SSH_CONNECT_TIMEOUT)

    return jump, target


# ---------------------------------------------------------------------------
# Résolution des chemins VTOM
# ---------------------------------------------------------------------------

def resolve_script_path(raw_value, scripts_dir):
    """
    Résout un chemin brut issu du XML VTOM vers un chemin absolu.

    Retourne None si le chemin est vide ou non résolvable.
    """
    if not raw_value or not isinstance(raw_value, str):
        return None

    s = raw_value.strip()
    if not s:
        return None

    # Syntaxe VTOM : '#' prefix → retirer le '#'
    if s.startswith('#'):
        return s[1:].strip() or None

    if s.startswith('/'):
        return s

    # Chemin relatif → concaténer avec scriptsDir
    base = scripts_dir.rstrip('/')
    return f"{base}/{s}" if base else None


def extract_from_vtom(data):
    """
    Parcourt le JSON VTOM et extrait :
      - scriptsDir : chemin de base des scripts
      - raw_scripts : liste de tous les chemins bruts référencés
    """
    try:
        env = data['Domain']['Environments']['Environment']
        scripts_dir = env.get('@scriptsDir', '')
    except (KeyError, TypeError):
        scripts_dir = ''

    raw_scripts = []
    _collect_scripts(data, raw_scripts)
    return scripts_dir, raw_scripts


def _collect_scripts(node, acc):
    """Parcours récursif du JSON VTOM pour collecter les champs 'Script'."""
    if isinstance(node, dict):
        script = node.get('Script')
        if isinstance(script, str):
            acc.append(script)
        for v in node.values():
            _collect_scripts(v, acc)
    elif isinstance(node, list):
        for item in node:
            _collect_scripts(item, acc)


# ---------------------------------------------------------------------------
# SFTP + extraction
# ---------------------------------------------------------------------------

def fetch_file(sftp, path):
    """Lit un fichier distant via SFTP. Tente UTF-8 puis Latin-1."""
    with sftp.file(path, 'r') as f:
        data = f.read()
    try:
        return data.decode('utf-8')
    except UnicodeDecodeError:
        return data.decode('latin-1')


def extract_chaine_batch(content):
    """
    Extrait les valeurs de CHAINE_BATCH d'un script shell.

    Gère les formats :
      CHAINE_BATCH=FOO,BAR
      CHAINE_BATCH="FOO,BAR"
      CHAINE_BATCH='FOO,BAR'

    Retourne une liste de chaînes, ou None si absent.
    """
    match = _RE_CHAINE_BATCH.search(content)
    if not match:
        return None
    values = [v.strip() for v in match.group(1).split(',') if v.strip()]
    return values or None


# ---------------------------------------------------------------------------
# Lecture de l'entrée
# ---------------------------------------------------------------------------

def read_vtom_from_stdin():
    """Lit et parse le JSON VTOM depuis stdin."""
    raw = sys.stdin.read()
    if not raw.strip():
        raise ValueError("JSON VTOM manquant — aucune donnée reçue sur stdin.")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON VTOM invalide : {e}")


def get_ssh_config():
    """Lit les variables SSH depuis l'environnement et valide."""
    config = {
        'jump_host':       os.getenv('JUMP_HOST', ''),
        'jump_port':       int(os.getenv('JUMP_PORT', '22')),
        'jump_user':       os.getenv('JUMP_USERNAME', ''),
        'jump_password':   os.getenv('JUMP_PASSWORD', ''),
        'target_host':     os.getenv('TARGET_HOST', ''),
        'target_port':     int(os.getenv('TARGET_PORT', '22')),
        'target_user':     os.getenv('TARGET_USERNAME', ''),
        'target_password': os.getenv('TARGET_PASSWORD', ''),
    }

    missing = [var for var in REQUIRED_SSH_VARS if not os.getenv(var, '')]
    if missing:
        raise ValueError(f"Variables SSH manquantes : {', '.join(missing)}")

    return config


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def build_fetch_list(single_script, scripts_dir, raw_scripts):
    """
    Construit le dictionnaire {chemin_résolu: chemin_brut} et la liste des skipped.
    En mode single_script, ne fetch qu'un seul script.
    """
    if single_script:
        resolved = resolve_script_path(single_script.strip(), scripts_dir)
        if not resolved:
            raise ValueError(
                f"Chemin de script invalide : impossible de résoudre "
                f"'{single_script}' (scriptsDir='{scripts_dir}')"
            )
        return {resolved: resolved}, []

    seen = set()
    to_fetch = {}
    skipped = []
    for raw in raw_scripts:
        if raw in seen:
            continue
        seen.add(raw)
        resolved = resolve_script_path(raw, scripts_dir)
        if resolved is None:
            skipped.append(raw)
        else:
            to_fetch[resolved] = raw

    return to_fetch, skipped


def fetch_all(sftp, to_fetch):
    """
    Récupère tous les scripts via SFTP. Retourne (fetched, errors, chaine_batch).
    Les erreurs sur un script n'interrompent pas les autres.
    """
    fetched = {}
    errors = {}
    chaine_batch = {}

    total = len(to_fetch)
    for i, remote_path in enumerate(to_fetch, 1):
        print(f"[INFO] ({i}/{total}) {remote_path}", file=sys.stderr)
        try:
            content = fetch_file(sftp, remote_path)
            fetched[remote_path] = content
            cb = extract_chaine_batch(content)
            if cb is not None:
                chaine_batch[remote_path] = cb
        except Exception as e:
            errors[remote_path] = str(e)

    return fetched, errors, chaine_batch


def main():
    try:
        ssh_config = get_ssh_config()
        vtom_data = read_vtom_from_stdin()
    except ValueError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    single_script = os.getenv('FETCH_SINGLE_SCRIPT')
    scripts_dir, raw_scripts = extract_from_vtom(vtom_data)

    try:
        to_fetch, skipped = build_fetch_list(single_script, scripts_dir, raw_scripts)
    except ValueError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    # --- Connexion SSH double-hop + SFTP ---
    jump = target = sftp = None
    try:
        jump, target = build_ssh_tunnel(**ssh_config)
        sftp = target.open_sftp()
        fetched, errors, chaine_batch = fetch_all(sftp, to_fetch)

    except paramiko.AuthenticationException as e:
        print(json.dumps({
            "error": "Échec d'authentification SSH",
            "message": str(e),
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
    except (paramiko.SSHException, socket.error) as e:
        print(json.dumps({
            "error": "Erreur de connexion SSH",
            "message": str(e),
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
    finally:
        if sftp:   sftp.close()
        if target: target.close()
        if jump:   jump.close()

    # Pas d'indent : le JSON est parsé par PHP, pas lu par un humain.
    print(json.dumps({
        "scriptsDir":   scripts_dir,
        "fetched":      fetched,
        "errors":       errors,
        "skipped":      skipped,
        "chaine_batch": chaine_batch,
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
