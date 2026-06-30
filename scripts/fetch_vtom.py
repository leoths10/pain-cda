#!/usr/bin/env python3
"""
Récupère le fichier PAY_TOURS.xml depuis le serveur VTOM distant via SSH/SFTP
et le convertit en JSON sur stdout.

Variables d'environnement requises :
  VTOM_SSH_HOST, VTOM_SSH_PORT, VTOM_SSH_USERNAME,
  VTOM_SSH_PASSWORD, VTOM_SSH_FILE_PATH
"""

import json
import os
import sys

try:
    import paramiko
    import xmltodict
except ImportError:
    print(json.dumps({
        "error": "Dépendances manquantes",
        "message": "pip install paramiko xmltodict",
    }), file=sys.stderr)
    sys.exit(1)

# Timeouts (secondes)
SSH_CONNECT_TIMEOUT = 10
SFTP_READ_TIMEOUT = 60

REQUIRED_VARS = [
    'VTOM_SSH_HOST', 'VTOM_SSH_PORT',
    'VTOM_SSH_USERNAME', 'VTOM_SSH_PASSWORD',
    'VTOM_SSH_FILE_PATH',
]


def get_env_config():
    """Lit et valide les variables d'environnement SSH."""
    env = {var: os.getenv(var, '') for var in REQUIRED_VARS}
    missing = [k for k, v in env.items() if not v]
    if missing:
        raise ValueError(f"Variables d'environnement manquantes : {', '.join(missing)}")

    try:
        env['VTOM_SSH_PORT'] = int(env['VTOM_SSH_PORT'])
    except ValueError:
        raise ValueError(f"VTOM_SSH_PORT doit être un nombre, reçu : {env['VTOM_SSH_PORT']}")

    return env


def fetch_xml(env):
    """
    Récupère le contenu XML depuis le serveur distant via SSH/SFTP.

    Le timeout SFTP est distinct du timeout de connexion SSH pour couvrir
    les cas où la connexion réussit mais le transfert est lent.
    """
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(
            hostname=env['VTOM_SSH_HOST'],
            port=env['VTOM_SSH_PORT'],
            username=env['VTOM_SSH_USERNAME'],
            password=env['VTOM_SSH_PASSWORD'],
            timeout=SSH_CONNECT_TIMEOUT,
        )

        sftp = ssh.open_sftp()
        sftp.get_channel().settimeout(SFTP_READ_TIMEOUT)

        try:
            with sftp.file(env['VTOM_SSH_FILE_PATH'], 'r') as f:
                return f.read().decode('utf-8')
        finally:
            sftp.close()

    except paramiko.AuthenticationException:
        raise ConnectionError(
            f"Échec d'authentification SSH pour "
            f"{env['VTOM_SSH_USERNAME']}@{env['VTOM_SSH_HOST']}"
        )
    except paramiko.SSHException as e:
        raise ConnectionError(f"Erreur SSH : {e}")
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Fichier introuvable sur le serveur : {env['VTOM_SSH_FILE_PATH']}"
        )
    finally:
        ssh.close()


def main():
    try:
        env = get_env_config()
        xml_content = fetch_xml(env)
        json_data = xmltodict.parse(xml_content)

        # Pas d'indent : le JSON est parsé par PHP, pas lu par un humain.
        # Sur un plan VTOM typique ça économise ~30 % de volume.
        print(json.dumps(json_data, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "error": "Erreur lors de la récupération du plan VTOM",
            "message": str(e),
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
