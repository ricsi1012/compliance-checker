# Compliance Checker POC

Ez egy Proof of Concept (POC) alkalmazás, amely az ISO 27001 megfelelőségi ellenőrzéseket támogatja AI-alapú dokumentumelemzés segítségével.

## 🛠 Technológiai Stack

A projekt mikroszerviz architektúrára épül a következő technológiákkal:

- **Frontend:**
  - **Keretrendszer:** React 19 + TypeScript
  - **Build Eszköz:** Vite
  - **Stílus:** Tailwind CSS 4
  - **HTTP Kliens:** Axios

- **Checklist Service (Backend):**
  - **Nyelv:** Java 17
  - **Keretrendszer:** Spring Boot 3.5.8
  - **Build Eszköz:** Maven

- **Evidence Analyzer (Backend):**
  - **Nyelv:** C# (.NET 8)
  - **Keretrendszer:** ASP.NET Core Web API
  - **Dokumentáció:** Swagger/OpenAPI

- **Infrastruktúra:**
  - **Konténerizáció:** Docker & Docker Compose

## 🏗 Architektúra

Az alkalmazás három fő szolgáltatásból áll, amelyek a `docker-compose.yml` fájlban vannak definiálva:

1.  **`checklist-service`**: Egy Spring Boot alkalmazás, amely kezeli a megfelelőségi ellenőrzőlistákat és azok státuszát.
2.  **`evidence-analyzer`**: Egy .NET 8 Web API, amely integrálódik az OpenAI-val a feltöltött dokumentumok megfelelőségi követelmények szerinti elemzéséhez.
3.  **`frontend`**: Egy React alkalmazás, amely felhasználói felületet biztosít az ellenőrzőlisták kezeléséhez és az elemzési eredmények megtekintéséhez.

## 🚀 Telepítés és Futtatás

### Előfeltételek
- Docker Desktop telepítve és futtatva.
- Egy OpenAI API kulcs.

### Utasítások

1.  **Környezet Konfigurálása:**
    Hozz létre egy `.env` fájlt a gyökérkönyvtárban, és add hozzá az OpenAI API kulcsodat:
    ```env
    OPENAI_API_KEY=az_te_valodi_api_kulcsod
    ```

2.  **Az Alkalmazás Indítása:**
    Futtasd a következő parancsot a gyökérkönyvtárban az összes szolgáltatás buildeléséhez és indításához:
    ```bash
    docker-compose up --build
    ```

3.  **Az Alkalmazás Elérése:**
    - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
    - **Checklist Service API:** [http://localhost:8080](http://localhost:8080)
    - **Evidence Analyzer API:** [http://localhost:5058](http://localhost:5058) (Belső 5000-es portra térképezve)

## 📂 Sample dokumentumok

- A feladatban kért példafájlok a gyökérben található `sample-documents/` mappában vannak (`all_pass.txt`, `all_fail.txt`, `mixed.txt`).

      - **Demo link:** https://www.loom.com/share/fluenta-compliance-checker-poc

## ⚠️ Jogi Nyilatkozat

Ez a projekt egy **Proof of Concept (POC)**, amely egy álláspályázati feladathoz készült. Az egyszerűség kedvéért memóriában tárolt adatokat használ, és nem alkalmas éles környezetben való használatra.
