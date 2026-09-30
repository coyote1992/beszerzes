# Fonte Viva – Beszerzési és tenderkövető (kattintható demó)

Függőségmentes, statikus prototípus a **Fonte Viva Kft. Beszerzési Szabályzata (01. verzió)** alapján.
Megnyitás: `index.html` böngészőben (vagy `npx http-server .`). Az adatok a böngésző `localStorage`-ában élnek; a bal alsó „Alaphelyzet" gomb visszaállítja az induló állapotot.

## Amit a demó tud

- **Irányítópult, beszerzéslista, jóváhagyásaim, feladatok, auditnapló, szabályzat-nézet**
- **PROC1–PROC6 folyamat** – az állapotot nem lehet közvetlenül átírni, csak műveleti gombokkal (kiküldés, ajánlatbontás, jóváhagyás, továbblépés). Minden lépésnél látszik, *mi hiányzik és kitől*.
- **Szabály-motor** (`js/rules.js`): értékhatár-besorolás (< 2 M / 2–20 M / > 20 M Ft), költséghely-jóváhagyók (11. melléklet), kötelező dokumentumcsomag típusonként, CEO+CFO jóváhagyás a tender kiküldése előtt, min. 3 ajánlattevő, SS/vészhelyzeti eljárás, 1 vagy 2 érvényes ajánlat kezelése, TCO/DCF CAPEX-nél, IFS-előminősítés, jogi+pénzügyi vélemény 20 M Ft felett, bankgarancia/CFO-eltérés, „az igénylő nem szavazhat" elv, vészhelyzeti dokumentáció 5 munkanapon belül.
- **Jóváhagyás dokumentumverzióhoz kötve** – új verzió feltöltése érvényteleníti a korábbi döntéseket.
- **Ajánlatkezelés**: arajanlat@ tendercsatorna, ajánlat-beérkezés (határidő utáni jelölés), lemondó nyilatkozat, **árak zárolva a bontásig**, bontási jegyzőkönyv, műszaki/kereskedelmi értékelés, súlyozott kiértékelési mátrix, TCO-számoló, tárgyalás és megtakarítás, SSD-generálás.
- **Auditnapló**: csak hozzáfűzhető, hash-lánccal; „Lánc ellenőrzése" és „Manipuláció szimulálása" gomb; CSV-export.
- **Feladatok** felelőssel, határidővel, leírással.
- Szerepkör-váltás (jobb felső menü), **demó-óra** (+1 munkanap), sötét téma.

## Éles megvalósítás felé

Power Apps + SharePoint-listák és dokumentumtár + Power Automate (jóváhagyások), Entra ID azonosítás; tartós megőrzéshez Microsoft Purview record/retention label. A `js/rules.js` szabályai a Power Automate-folyamatok és a lista-validációk specifikációjaként használhatók.

## Ismert szabályzati eltérés

Az 1. melléklet (BSD) 1/10 M Ft határokat említ; a demó a 7. fejezet (2/20 M Ft) egységes mátrixát használja.
