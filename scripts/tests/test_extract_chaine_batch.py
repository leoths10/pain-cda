"""
Tests unitaires de `extract_chaine_batch` (scripts/fetch_scripts.py).

Fonction pure : extrait les valeurs de la variable CHAINE_BATCH d'un script
shell. Regex ancrée en début de ligne (MULTILINE), gère les guillemets simples
et doubles, s'arrête au premier `"`, `'`, `;` ou retour à la ligne.
Retourne une liste de chaînes non vides, ou None si absente.
"""

import pytest

from fetch_scripts import extract_chaine_batch


# ── Formats nominaux ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("content, expected", [
    ("CHAINE_BATCH=FOO,BAR", ["FOO", "BAR"]),
    ('CHAINE_BATCH="FOO,BAR"', ["FOO", "BAR"]),       # guillemets doubles
    ("CHAINE_BATCH='FOO,BAR'", ["FOO", "BAR"]),       # guillemets simples
    ("CHAINE_BATCH=FOO", ["FOO"]),                    # valeur unique
])
def test_extract_formats(content, expected):
    assert extract_chaine_batch(content) == expected


# ── Ancrage / contexte de ligne ───────────────────────────────────────────────

def test_extract_finds_line_among_others():
    script = "#!/bin/bash\necho hi\nCHAINE_BATCH=A,B\nexit 0\n"
    assert extract_chaine_batch(script) == ["A", "B"]


def test_extract_allows_leading_whitespace():
    assert extract_chaine_batch("    CHAINE_BATCH=FOO,BAR") == ["FOO", "BAR"]


def test_extract_ignores_commented_line():
    # Une ligne commentée ne commence pas par CHAINE_BATCH= → ignorée.
    assert extract_chaine_batch("# CHAINE_BATCH=FOO,BAR") is None


def test_extract_ignores_midline_occurrence():
    # `export CHAINE_BATCH=...` ne commence pas la ligne par la variable.
    assert extract_chaine_batch("export CHAINE_BATCH=FOO") is None


def test_extract_returns_first_match():
    script = "CHAINE_BATCH=FIRST\nCHAINE_BATCH=SECOND\n"
    assert extract_chaine_batch(script) == ["FIRST"]


def test_extract_stops_at_semicolon():
    assert extract_chaine_batch("CHAINE_BATCH=FOO,BAR; echo done") == ["FOO", "BAR"]


# ── Nettoyage des valeurs ─────────────────────────────────────────────────────

def test_extract_trims_values_and_drops_empties():
    assert extract_chaine_batch("CHAINE_BATCH= FOO , , BAR ,") == ["FOO", "BAR"]


# ── Cas limites → None ────────────────────────────────────────────────────────

@pytest.mark.parametrize("content", [
    "",                          # vide
    "echo nothing here\n",       # absent
    "CHAINE_BATCH=",             # déclarée mais sans valeur
    "CHAINE_BATCH=,,,",          # que des séparateurs → aucune valeur utile
])
def test_extract_absent_or_empty_returns_none(content):
    assert extract_chaine_batch(content) is None
