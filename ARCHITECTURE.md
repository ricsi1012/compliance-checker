# Architecture Decisions

## Backend választás
A feladatkiírás két különböző nyelvet kért.
- **Java (Spring Boot):** A Checklist Service-hez választottam, mivel a Spring Boot kiválóan kezeli a strukturált adatokat és a REST API-kat.
- **C# (.NET 8):** Az Evidence Analyzer-hez választottam, mivel a C# modern HTTP kliensei és erős típusossága ideális a külső AI API-k (OpenAI) kezeléséhez.

## Adattárolás
POC jelleggel in-memory tárolást (ConcurrentHashMap) használtam a gyors fejlesztés és az egyszerű hordozhatóság érdekében (nincs szükség külön DB konténerre).

## Frontend
React + Vite + Tailwind CSS a gyors, modern és reszponzív UI érdekében.
