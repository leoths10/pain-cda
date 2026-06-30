"""
Utilitaire de développement : convertit `tours.xml` (snapshot local du plan
VTOM committé à la racine) en `tours.json` pour inspection manuelle.

Ce script n'est pas utilisé par l'application — `back/` récupère le XML via
SSH puis le parse en mémoire. Il sert uniquement à dump un JSON lisible
quand on debug un cas de parsing sans avoir besoin d'accès SSH.
"""

import xmltodict
import json

xml_path= "tours.xml"
json_path = "tours.json"

with open(xml_path, "r", encoding="utf-8") as f:
    xml_content = f.read()

data  = xmltodict.parse(xml_content)
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)