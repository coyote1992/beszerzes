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
| Felület | `src/` (React 19, Vite, Tailwind v4, shadcn + Blode UI) | Irányítópult, beszerzések, jóváhagyások, feladatok, auditnapló, szabályzat, beállítások, bemutató (onboarding) |
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
2. **API permissions**: Microsoft Graph *Application* `Sites.Selected` + *Delegated* `openid`, `profile`, `email` (admin consent).
   A „Beszerzés” webhelyre az alkalmazásnak **manage** szerepkör kell (a *write* csak elemeket és fájlokat írhat, listát létrehozni nem).
   Graph Explorerben (SharePoint-/globális adminként, `Sites.FullControl.All` hozzájárulással):
   - `GET https://graph.microsoft.com/v1.0/sites/<SP_SITE_ID>/permissions` → az alkalmazáshoz tartozó bejegyzés `id`-ja
   - `PATCH https://graph.microsoft.com/v1.0/sites/<SP_SITE_ID>/permissions/<id>` törzs: `{ "roles": ["manage"] }`
   - (PnP PowerShell-lel ugyanez: `Set-PnPAzureADAppSitePermission -PermissionId <id> -Permissions Manage`)
3. Ha csak kijelölt munkatársak léphetnek be: Enterprise applications → az alkalmazás → Properties → *Assignment required = Yes*, majd Users and groups alatt hozzárendelés.

Ha a kliens titok lejár, új titkot kell létrehozni és a `MS_CLIENT_SECRET` értékét frissíteni (a meglévő bejelentkezések ilyenkor érvénytelenné válnak, ha nincs külön `SESSION_SECRET`).
