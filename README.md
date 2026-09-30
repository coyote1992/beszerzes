# Fonte Viva – Beszerzési Központ (kattintható demó)

Auditálható beszerzés- és tenderkövető prototípus a **Fonte Viva Kft. Beszerzési Szabályzata (01. verzió)** alapján.

**Megnyitás:** `demo/index.html` – egyetlen, önálló fájl, dupla kattintással működik (nincs szerver, nincs telepítés).
Az adatok a böngésző `localStorage`-ában élnek; a bal alsó „Alaphelyzet" gomb visszaállítja az induló állapotot.

```bash
npm install
npm run dev      # fejlesztői szerver
npm run build    # tsc + vite → demo/index.html (single-file)
```

## Stack

React 19 + TypeScript + Vite + Tailwind v4, **shadcn CLI**-vel telepített komponensek:

| Réteg | Forrás |
| --- | --- |
| Tokenek + komponensek (Button, Sheet, Dialog, Tabs, Stepper, Table, Select, Command, Popover, Sonner …) | [**Blode UI**](https://blode.co/ui) registry (`@blode`, Base UI + Tailwind v4) |
| Kiegészítő registry (beállítva, ha további Base UI-komponens kell) | [**basecn**](https://basecn.dev) (`@basecn`) |
| Mozgás- és részletszabályok | [Emil Kowalski design-eng skillek](https://github.com/emilkowalski/skills) elvei |

Kowalski-elvek a kódban: erős egyedi ease-out görbék (`--ease-out`, `--ease-drawer`), 160–300 ms alatti UI-animációk, `:active` skálázás minden gombon, félig átlátszó árnyék a kemény keret helyett, belépő animáció csak navigációkor (nem minden állapotváltásnál), gyakori műveletek (⌘K, fülváltás) minimális mozgással.

## Design

„Forrás" – meleg krémszínű papír-alap, szilva tinta, és hat élénk, jelentéshordozó szín: **minden PROC-szakasznak saját színe van** (korall → borostyán → levélzöld → aqua → ibolya → rózsa). Ez jelenik meg a folyamat-térképen (kanban-szerű pipeline), a stepperben, a listában és a részletek fejlécében. Világos és sötét téma, mobilon alsó navigáció.

## Amit a demó tud

- **Irányítópult**: KPI-csempék, folyamat-térkép (aktív beszerzések PROC-oszlopokban), teendők, élő szabályzati figyelmeztetések.
- **PROC1–PROC6 folyamat**: az állapotot nem lehet közvetlenül átírni, csak műveleti gombokkal; minden lépésnél látszik, *mi hiányzik és kitől*.
- **Szabály-motor** (`src/engine/engine.js`): értékhatár-besorolás (< 2 M / 2–20 M / > 20 M Ft), költséghely-jóváhagyók (11. melléklet), kötelező dokumentumcsomag típusonként, CEO+CFO jóváhagyás a tender kiküldése előtt, min. 3 ajánlattevő, SS és vészhelyzeti eljárás, 1–2 érvényes ajánlat kezelése, TCO/DCF CAPEX-nél, IFS-előminősítés, jogi+pénzügyi vélemény 20 M Ft felett, bankgarancia/CFO-eltérés, „az igénylő nem szavazhat", vészhelyzeti dokumentáció 5 munkanapon belül.
- **Jóváhagyás dokumentumverzióhoz kötve** – új verzió érvényteleníti a korábbi döntéseket.
- **Ajánlatkezelés**: arajanlat@ tendercsatorna, késve érkezett jelölés, lemondó nyilatkozat, **árak zárolva a bontásig**, bontási jegyzőkönyv, műszaki/kereskedelmi értékelés, súlyozott mátrix, TCO-számoló, tárgyalás és megtakarítás, SSD-generálás.
- **Auditnapló**: csak hozzáfűzhető, hash-lánccal; „Lánc ellenőrzése", „Manipuláció szimulálása", CSV-export.
- **Feladatok** felelőssel, határidővel, leírással.
- Szerepkör-váltás (topbar és a részletek panel alján), **demó-óra** (+1 munkanap), ⌘/Ctrl+K parancspaletta.

## Szerkezet

```
src/engine/     szabály-motor, seed adatok, parancsok (UI-független, JS)
src/components/ui/   Blode UI komponensek (shadcn CLI-vel)
src/components/app/  oldalak, részletek panel, párbeszédablakok
src/lib/        store (motor + UI állapot), közös UI segédek
demo/index.html  kész, önálló build
```

## Éles megvalósítás felé

Power Apps + SharePoint-listák és dokumentumtár + Power Automate (jóváhagyások), Entra ID azonosítás; tartós megőrzéshez Microsoft Purview record/retention label. Az `engine.js` szabályai a Power Automate-folyamatok és a lista-validációk specifikációjaként használhatók.

## Ismert szabályzati eltérés

Az 1. melléklet (BSD) 1/10 M Ft határokat említ; a demó a 7. fejezet (2/20 M Ft) egységes mátrixát használja.
