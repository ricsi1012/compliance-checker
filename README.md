# Compliance Checker POC

Mikroszerviz alapú POC alkalmazás ISO 27001 megfelelőség ellenőrzésére AI segítségével.

## 🏗 Architektúra
- **Frontend:** React + TypeScript + Vite (Tailwind CSS)
- **Checklist Service:** Java (Spring Boot) - In-memory adattárolás
- **Evidence Analyzer:** C# (.NET 8) - OpenAI integráció
- **Infrastructure:** Docker Compose

## 🚀 Futtatás
Előfeltétel: Docker Desktop futtatása.

1. Klónozd a repót.
2. Állítsd be az OpenAI API kulcsot a `docker-compose.yml` fájlban.
3. Indítsd el a rendszert:
   ```bash
   docker-compose up --build
   ```

4. Nyisd meg a böngészőben: http://localhost:5173

## ⏱ Ráfordított idő

- **Backend (Java & C#):** 1.5 óra
- **Frontend & UI:** 1.5 óra
- **Docker & DevOps:** 0.5 óra
- **Dokumentáció & Polírozás:** 0.5 óra
- **Összesen:** ~4 óra
