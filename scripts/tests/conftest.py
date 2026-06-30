"""
Configuration pytest pour les tests de logique pure de `scripts/`.

Objectif : pouvoir tester les fonctions déterministes de `fetch_scripts.py`
(résolution de chemins, extraction CHAINE_BATCH) **sans aucune infrastructure**
— ni SSH, ni paramiko installé.

`fetch_scripts.py` fait `import paramiko` au chargement du module (et `sys.exit`
si absent). Comme nos tests n'appellent aucune fonction réseau, on injecte un
stub de paramiko quand il n'est pas installé : l'import du module réussit, et la
suite reste 100 % autonome.
"""

import sys
import types
from pathlib import Path

# Rendre `scripts/` importable (pour `import fetch_scripts`).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Stub paramiko si absent — les tests de logique pure n'en ont pas besoin.
try:
    import paramiko  # noqa: F401
except ImportError:
    sys.modules["paramiko"] = types.ModuleType("paramiko")
