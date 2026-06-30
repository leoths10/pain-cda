#!/usr/bin/env python3
"""
Récupère la version de paysage depuis le jump host.

Variables d'environnement requises :
  JUMP_HOST, JUMP_PORT, JUMP_USERNAME, JUMP_PASSWORD

Sortie JSON (stdout) :
  { "version": "<nom_du_livrable>" }
"""

import json
import os
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

REQUIRED_VARS = ['JUMP_HOST', 'JUMP_USERNAME', 'JUMP_PASSWORD']


def get_ssh_config():
    config = {
        'host':     os.getenv('JUMP_HOST', ''),
        'port':     int(os.getenv('JUMP_PORT', '22')),
        'username': os.getenv('JUMP_USERNAME', ''),
        'password': os.getenv('JUMP_PASSWORD', ''),
    }
    missing = [v for v in REQUIRED_VARS if not os.getenv(v, '')]
    if missing:
        raise ValueError(f"Variables SSH manquantes : {', '.join(missing)}")
    return config


def main():
    try:
        cfg = get_ssh_config()
    except ValueError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    client = None
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=cfg['host'],
            port=cfg['port'],
            username=cfg['username'],
            password=cfg['password'],
            timeout=SSH_CONNECT_TIMEOUT,
        )

        _, stdout, stderr = client.exec_command(
            'ls -t /data/pay/export_nfs/livrables/sources/ | head -1'
        )
        version = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()

        if not version:
            msg = err if err else "Aucun livrable trouvé dans /data/pay/export_nfs/livrables/sources/"
            print(json.dumps({"error": msg}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)

        print(json.dumps({"version": version}, ensure_ascii=False))

    except paramiko.AuthenticationException as e:
        print(json.dumps({
            "error": "Échec d'authentification SSH",
            "message": str(e),
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": "Erreur de connexion SSH",
            "message": str(e),
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
    finally:
        if client:
            client.close()


if __name__ == '__main__':
    main()
