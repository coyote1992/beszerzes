# Fonte Viva – Beszerzési Központ

Beszerzés- és tenderkövető alkalmazás a **Fonte Viva Kft. Beszerzési Szabályzata** (PROC1–PROC6) alapján.
Éles cím: **https://beszerzes.vercel.app** – csak Fonte Viva-s Microsoft-fiókkal lehet belépni.

```bash
npm install
npm run dev            # csak a felület (az /api végpontok a Vercelen futnak; helyben: `vercel dev`)
npm run build          # tsc + vite → dist/
npm run typecheck:api  # a szerveroldali függvények típusellenőrzése
```

## Felépítés

| Réteg | Hol | Mit csinál |
| --- | --- | --- |
| Felület | `src/` (React 19, Vite, Tailwind v4, shadcn + Blode UI) | Irányítópult, beszerzések, jóváhagyások, feladatok, auditnapló, szabályzat, döntési fa (`src/components/app/Tree.tsx` – a szabálymotorral összhangban tartandó), beállítások (szerepkörök, saját szerepkörök, költséghely-jóváhagyók, munkatársak), bemutató |
| Szabálymotor | `src/engine/` | Értékhatárok, kötelező dokumentumok, jóváhagyási láncok, PROC-lépések – UI-független |
| Szinkron | `src/lib/sync.ts` | Minden módosítást pár száz ms után elküld (`/api/sync`); 90 mp-enként frissít, ha nincs nyitott ablak vagy mentetlen adat |
| Szerver | `api/` (Vercel Functions) | Bejelentkezés, SharePoint-írás/olvasás Microsoft Graph-on keresztül, auditlánc |

### Bejelentkezés

- `/api/auth/login` → Microsoft-fiókválasztó (`prompt=select_account`), csak a Fonte Viva tenant fiókjai (vendégfiók nem).
- A munkamenet egy aláírt, HttpOnly süti, **10 óráig** érvényes; utána újra be kell jelentkezni.
- Az első bejelentkező automatikusan **adminisztrátor** lesz; mindenki más az első belépéskor felkerül a Munkatársak listára. Inaktívra állított munkatárs nem léphet be.

### SharePoint („Beszerzés” webhely)

Az első betöltéskor az alkalmazás létrehozza a listákat (magyar oszlopnevekkel; az `AppData` rejtett oszlop a teljes rekordot tárolja):

| Lista | Tartalom |
| --- | --- |
| Beszerzések | tárgy, szervezet, költséghely, érték, kategória, eljárás, típus, szakasz, státusz, felelősök, határidők, nyertes, végső ár, mappa |
| Ajánlattevők | beszerzés, e-mail, állapot, formai megfelelés, ár, fizetési/szállítási feltétel, műszaki pont |
| Jóváhagyások | beszerzés, típus, kérte, állapot, jóváhagyók, döntések, jóváhagyott dokumentum |
| Feladatok | leírás, felelős, kiosztotta, határidő, beszerzés, elvégezve |
| Dokumentum-nyilvántartás | beszerzés, típus, verzió, ajánlattevő, feltöltötte, időpont, fájl hivatkozás |
| Munkatársak | név, e-mail, beosztás, szerepkörök, admin, aktív |
| Beállítások | szerepkör-kijelölések, költséghely-jóváhagyók, auditlánc feje |
| Auditnapló | sorszám, időpont, felhasználó, beszerzés, típus, részletek, előző hash, hash |
| Auditnapló – teszt | a TESZT beszerzések naplója (törölhető, nem része a láncnak) |

Dokumentumok: `Dokumentumok / Beszerzések / <azonosító tárgy> / 01 – … 11 – …` (a szabályzat szerinti almappák).
Gyakorló beszerzések: `Dokumentumok / Teszt beszerzések / …` – ezek a beszerzés lapjáról véglegesen törölhetők.

### Auditnapló

Az eseményeket a **szerver** írja és láncolja (SHA-256, előző hash + sorszám + időpont + felhasználó + tartalom). A lánc feje ETag-gel védett, így párhuzamos mentésnél sem szakad meg. „Lánc ellenőrzése” = `/api/audit/verify`.

## Beállítás (egyszeri)

Vercel környezeti változók (Production): `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `SP_SITE_ID`; opcionálisan `SESSION_SECRET` (különben a kliens titokból származik) és `APP_ORIGIN` (alapértelmezés: `https://beszerzes.vercel.app`).

Entra ID alkalmazásregisztráció:
1. **Authentication → Add a platform → Web**, Redirect URI: `https://beszerzes.vercel.app/api/auth/callback`
2. **API permissions**: Microsoft Graph *Application* `Sites.Selected` (a „Beszerzés” webhelyre **write** joggal) + *Delegated* `openid`, `profile`, `email` (admin consent).
3. Ha csak kijelölt munkatársak léphetnek be: Enterprise applications → az alkalmazás → Properties → *Assignment required = Yes*, majd Users and groups alatt hozzárendelés.

Ha a kliens titok lejár, új titkot kell létrehozni és a `MS_CLIENT_SECRET` értékét frissíteni (a meglévő bejelentkezések ilyenkor érvénytelenné válnak, ha nincs külön `SESSION_SECRET`).

## SharePoint-listák kézi létrehozása

*write* joggal az alkalmazás nem tud listát létrehozni, ezért a listákat kézzel kell elkészíteni a „Beszerzés” webhelyen
(vagy ideiglenesen *manage* jogot adni, és akkor az alkalmazás maga hozza létre őket).
Minden lista „Cím” oszlopa marad. Az oszlopnevekben az ékezet, a kis-/nagybetű és a kötőjel nem számít.
A ★ oszlopok kötelezők, a többi csak a SharePointban való olvashatóságot szolgálja – bármikor hozzáadható (a sorok a következő mentéskor töltődnek ki).

Típusok: **Egysoros** = Egysoros szöveg · **Többsoros** = Többsoros szöveg (bővített formázás KI) · **Szám** · **Dátum** = Dátum és idő · **Igen/Nem**

| Lista | Oszlopok |
| --- | --- |
| Beszerzések | ★ AppId (Egysoros), ★ AppData (Többsoros); Egysoros: Tárgy, Igénylő szervezet, Költséghely, Kategória, Eljárás, Beszerzési típus, Szakasz, Státusz, Igénylő, Felelős beszerző, Következő lépés, Szerződéstípus, Nyertes beszállító; Szám: Becsült nettó érték, Végső ár, Megtakarítás; Dátum: Következő határidő, Kívánt teljesítés, Ajánlattételi határidő, Lezárva, Létrehozás dátuma; Igen/Nem: IFS-kritikus, Teszt; Többsoros: Dokumentummappa |
| Ajánlattevők | ★ AppId, ★ AppData; Egysoros: Beszerzés, E-mail, Ajánlattevő típusa, Állapot, Formailag megfelelő; Szám: Nettó ár, Fizetési határidő (nap), Szállítási idő (hét), Jótállás (hó), Műszaki pontszám; Dátum: Beérkezett; Igen/Nem: Új beszállító |
| Jóváhagyások | ★ AppId, ★ AppData; Egysoros: Beszerzés, Jóváhagyás típusa, Kérte, Állapot; Dátum: Kérve; Többsoros: Döntések |
| Feladatok | ★ AppId, ★ AppData; Egysoros: Felelős, Kiosztotta, Beszerzés; Dátum: Határidő, Elvégezve; Többsoros: Leírás |
| Dokumentum-nyilvántartás | ★ AppId, ★ AppData; Egysoros: Beszerzés, Dokumentumtípus, Ajánlattevő, Feltöltötte, Megjegyzés; Szám: Dokumentumverzió; Dátum: Időpont; Többsoros: Fájl hivatkozás |
| Munkatársak | ★ AppId, ★ AppData; Egysoros: E-mail, Beosztás, Szerepkörök; Igen/Nem: Adminisztrátor, Aktív |
| Beállítások | ★ AppId, ★ AppData |
| Auditnapló | ★ AppData; Egysoros: Felhasználó, E-mail, Beszerzés, Esemény típusa, Előző hash, Hash; Szám: Sorszám; Dátum: Időpont; Többsoros: Részletek |
| Auditnapló – teszt | ugyanaz, mint az Auditnapló |

(A zárójeles mértékegység nem része az oszlopnévnek: „Fizetési határidő”, „Szállítási idő”, „Jótállás”.)
Ha valami hiányzik vagy rossz típusú, az alkalmazás hibaképernyője pontosan megnevezi a listát és az oszlopot.
