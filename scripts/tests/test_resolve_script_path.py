"""
Tests unitaires de `resolve_script_path` (scripts/fetch_scripts.py).

Fonction pure : résout un chemin brut issu du XML VTOM vers un chemin absolu,
selon 3 règles —
  - préfixe '#'   → on retire le '#'
  - commence '/'  → chemin absolu, inchangé
  - relatif       → concaténé avec scriptsDir
Retourne None si l'entrée est vide / non résolvable.
"""

import pytest

from fetch_scripts import resolve_script_path


# ── Cas nominaux : les 3 règles ───────────────────────────────────────────────

@pytest.mark.parametrize("raw, scripts_dir, expected", [
    # Règle '#' : retrait du préfixe
    ("#/app/foo.sh", "/scripts", "/app/foo.sh"),
    ("#  /app/foo.sh", "/scripts", "/app/foo.sh"),   # espaces après '#'
    # Règle '/' : absolu inchangé (scriptsDir ignoré)
    ("/app/bar.sh", "/scripts", "/app/bar.sh"),
    ("/app/bar.sh", "", "/app/bar.sh"),
    # Règle relatif : jointure avec scriptsDir
    ("baz.sh", "/scripts", "/scripts/baz.sh"),
    ("baz.sh", "/scripts/", "/scripts/baz.sh"),       # slash final normalisé
    ("sub/baz.sh", "/scripts", "/scripts/sub/baz.sh"),
])
def test_resolve_rules(raw, scripts_dir, expected):
    assert resolve_script_path(raw, scripts_dir) == expected


# ── Espaces de bord ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw, expected", [
    ("  /app/foo.sh  ", "/app/foo.sh"),
    ("  baz.sh  ", "/scripts/baz.sh"),
])
def test_resolve_strips_whitespace(raw, expected):
    assert resolve_script_path(raw, "/scripts") == expected


# ── Cas limites → None ────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw", ["", "   ", None, 42, ["/app/foo.sh"]])
def test_resolve_empty_or_invalid_returns_none(raw):
    assert resolve_script_path(raw, "/scripts") is None


def test_resolve_hash_only_returns_none():
    # '#' seul → rien après retrait → None
    assert resolve_script_path("#", "/scripts") is None
    assert resolve_script_path("#   ", "/scripts") is None


def test_resolve_relative_without_scripts_dir_returns_none():
    # Chemin relatif mais aucun scriptsDir pour le préfixer → non résolvable.
    assert resolve_script_path("baz.sh", "") is None


def test_resolve_hash_relative_stays_relative():
    # Comportement documenté : '#' + relatif n'est PAS joint à scriptsDir,
    # le '#' est simplement retiré et la valeur retournée telle quelle.
    assert resolve_script_path("#baz.sh", "/scripts") == "baz.sh"
