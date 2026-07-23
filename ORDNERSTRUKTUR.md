# ORDNERSTRUKTUR — Fahrtkosten-App (verbindlich)

**Grundprinzip: Der PFAD zählt, nicht der Dateiname.**
Die App (und alle Kolleg:innen) finden die gültige Datei über den Ordner,
nicht über den Namen. Umbenennen ist erlaubt; Verschieben nicht.

```
<Projektordner>/                     ← liegt in der IBS-Cloud (synchronisiert)
│
├── daten/
│   ├── haupt/                       ← GENAU EINE .xlsx: die Hauptdatei
│   │   └── Alle_TN_Daten.xlsx         (Stammdaten + Jahres-Übersichten)
│   │
│   ├── anwesenheit/                 ← GENAU EINE .xlsx: die Anwesenheitsliste
│   │   └── Anwesenheitsliste_2026.xlsx  des laufenden Jahres
│   │
│   ├── vorlagen/                    ← GENAU EINE .xlsx: die Formular-Vorlage
│   │   └── Template_FHKT_Abrechnung.xlsx
│   │
│   ├── formulare/                   ← erzeugte Abrechnungsformulare
│   │   └── 2026-01/                    (ein Unterordner pro Monat;
│   │       └── PK01_Abrechnung_2026-01.xlsx   Muster: <TN-ID>_Abrechnung_<JJJJ-MM>)
│   │
│   └── backups/                     ← automatische Backups der App
│                                       (Zeitstempel im Namen, vor JEDEM Schreiben)
│
└── ORDNERSTRUKTUR.md                ← dieses Dokument
```

## Regeln

1. **Genau eine .xlsx pro Datenordner.** Liegt in `daten/haupt/` oder
   `daten/anwesenheit/` mehr als eine Datei, verweigert die App den Zugriff
   und nennt die Kandidaten — sie rät niemals, welche „die richtige" ist.
   Alte Versionen gehören nach `daten/backups/`.
2. **Backups löscht nur ein Mensch.** Die App schreibt vor jeder Änderung
   eine Kopie nach `daten/backups/` (`<name>_backup_<zeitstempel>.xlsx`).
   Monatlich aufräumen ist ok; automatisch gelöscht wird nie.
3. **Nicht gleichzeitig in Excel offen halten,** während die App schreibt.
   Excel-Dateien können nicht zusammengeführt werden — der letzte Schreiber
   gewinnt. Im Zweifel: Excel schließen, App nutzen, oder umgekehrt.
4. **Jahreswechsel:** neue Anwesenheitsliste nach `daten/anwesenheit/`
   legen, die alte nach `daten/backups/` verschieben. In der Hauptdatei
   genügt das neue Jahres-Übersichtsblatt — die App erkennt Blätter am
   Inhalt, nicht am Namen.
5. **Struktur ändern = hier dokumentieren.** Wer einen Ordner ergänzt oder
   umzieht, aktualisiert dieses Dokument im selben Schritt.

## Warum so?

Die App erkennt Tabellenspalten über Kopfzeilen (Umsortieren bricht nichts)
und Dateien über Pfade (Umbenennen bricht nichts). Nur zwei Dinge können
den Zugriff stoppen: eine gelöschte Pflichtspalte oder eine Datei am
falschen Ort — und beides meldet die App mit einer klaren Ansage statt
mit stillem Fehlverhalten.
