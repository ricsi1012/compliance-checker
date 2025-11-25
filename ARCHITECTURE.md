# Architektúra Áttekintés

## 🏗 Mikroszerviz Tervezés
A projekt mikroszerviz architektúrát követ a felelősségi körök szétválasztása és a feladatban kért többnyelvű programozási képességek demonstrálása érdekében.

- **`checklist-service` (Java/Spring Boot):**
  - **Szerep:** A megfelelőségi ellenőrzőlisták "nyilvántartó rendszereként" (System of Record) működik.
  - **Indoklás:** A Java és a Spring Boot iparági szabványok a robusztus, vállalati szintű backend szolgáltatásokhoz. Kiválóan kezelik a strukturált domain adatokat (ellenőrzőlisták, elemek, státuszok).
  - **Szerkezet:** A standard Controller-Service-Repository mintát követi (szimulált repository-val).

- **`evidence-analyzer` (C#/.NET 8):**
  - **Szerep:** Az "Intelligencia Motor". Állapotmentes, számításigényes feladatokat (AI elemzés) lát el.
  - **Indoklás:** A C# és a .NET 8 kiváló teljesítményt és modern nyelvi funkciókat (mint a Record-ok és a raw string literálok) kínál, amelyek nagyon hatékonnyá teszik a JSON-nal és külső API-kkal (OpenAI) való munkát.
  - **Szerkezet:** Web API dedikált `AIService` és `PromptFactory` osztályokkal az LLM logika egységbe zárásához.

- **`frontend` (React/TypeScript):**
  - **Szerep:** A felhasználói felület.
  - **Indoklás:** A React komponens-alapú architektúrát kínál, amely könnyen karbantartható. A TypeScript típusbiztonságot nyújt a backend API-kkal való interakció során. A Vite gyors fejlesztési élményt biztosít.

## 🔄 Adatfolyam

1.  **Felhasználói Interakció:** A felhasználó megnyitja a Frontendet (React).
2.  **Adatok Lekérése:** A Frontend REST API hívást indít a `checklist-service` felé (8080-as port) a megfelelőségi kontrollok listájának lekéréséhez.
3.  **Bizonyíték Elemzése:**
    - A felhasználó feltölt egy szöveget/bizonyítékot egy adott kontrollhoz.
    - A Frontend elküldi ezt az adatot az `evidence-analyzer`-nek (5058/5000-es port).
    - Az `evidence-analyzer` összeállít egy promptot a `PromptFactory` segítségével.
    - Meghívja az **OpenAI API**-t az értékeléshez.
    - Az eredmény (Egyezés/Nincs egyezés, Javaslatok) visszakerül a Frontendhez.
4.  **Státusz Frissítése:** Az elemzés alapján a Frontend meghívja a `checklist-service`-t a kontroll státuszának frissítéséhez (pl. "Folyamatban" vagy "Megfelelt").

## 🐳 Konténerizáció
A **Docker Compose** a teljes környezet hangszerelésére szolgál.

- **Szolgáltatás Felderítés:** A szolgáltatások a belső Docker hálózaton (`app-network`) keresztül kommunikálnak.
- **Port Térképezés:**
  - `8080`: A Java backend számára nyitva.
  - `5058`: A C# backend számára nyitva (a belső 5000-es portra térképezve).
  - `5173`: A Frontend számára nyitva.
- **Környezeti Konfiguráció:** A környezeti változók (mint az API kulcsok és Base URL-ek) a `docker-compose.yml` fájlon keresztül kerülnek injektálásra, biztosítva a konfiguráció és a kód szétválasztását.

## 💡 Tervezési Döntések
- **Memóriában Tárolás:** Ehhez a POC-hoz `ConcurrentHashMap`-et (Java) használtam adatbázis helyett, hogy a telepítés egyszerű és önálló maradjon, elkerülve egy külön adatbázis konténer szükségességét.
- **Strukturált JSON Promptok:** Az AI integráció szigorú JSON sémákat használ a promptokban, hogy biztosítsa, hogy az LLM kimenete megbízhatóan feldolgozható legyen a C# backend által, elkerülve az adatformátum "hallucinációit".
