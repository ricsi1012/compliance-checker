# AI Használat Dokumentáció

## Eszközök és használatuk
A projekt fejlesztését AI-alapú kódolási asszisztensek gyorsították, elsősorban a **GitHub Copilot** használatával.

- **ChatGPT 5.1 Codex:** Boilerplate kódok generálása a mikroszervizekhez, hibajavítás
- **Gemini 3 Pro:** Komplex Docker konfigurációs fájlok írása, Prompt engineering
- **Claude Sonnet 4.5:** Architecture design

## Prompt példák

### 1. Az AI Szolgáltatás Logikájához (C#)
> "I need to create a .NET 8 Web API for an 'Evidence Analyzer Service'. Tech Stack: C#, ASP.NET Core Minimal APIs. Goal: Analyze text documents using an LLM OpenAI to check compliance. Requirements:
>
> Create a generic AIService that calls OpenAI API (chat completions). Assume API Key is in appsettings.json.
>
> **Endpoint:** `POST /analyze/match`
> - **Input JSON:** `{ "requirement": "...", "documentText": "...", "hints": ["..."] }`
> - **Logic:** Construct a system prompt that asks the LLM if the document matches the requirement.
> - **Output JSON:** `{ "matches": bool, "confidence": float, "reasoning": "string" }`
>
> **Important:** Enable CORS for `http://localhost:5173`.
>
> Provide the `Program.cs` fully configured with DI and endpoints, and the `AIService` class. Include the prompt text you would send to the LLM in the code."

### 2. A Checklist Szolgáltatáshoz (Java/Spring)
> "I need to create a Spring Boot application for a 'Checklist Service' as part of a POC. Tech Stack: Java 17+, Spring Boot 3, Maven. Requirements:
>
> - No database. Store data in-memory (use a static List or Map).
> - **Data model:** `Checklist` (id, name, items list) and `ChecklistItem` (id, category, requirement, hints list, status enum [pending/passed/failed], evidence string).
> - Pre-load a simplified ISO 27001 checklist on startup (Access Control, Incident Management, Data Protection - 3 items each).
>
> **Endpoints:**
> - `GET /api/checklists` (return all)
> - `GET /api/checklists/{id}`
> - `POST /api/checklists/{id}/items/{itemId}/status` (update status and save optional evidence text)
> - `GET /api/checklists/{id}/progress` (calculate percentage of 'passed' items)
>
> **Important:** Enable CORS for `http://localhost:5173` (Vite default).
>
> Please provide the `pom.xml` dependencies, the main Application class, the Controller, and the Model classes in a single response."

### 3. A Frontend UI-hoz (React)
> "I am building a React + TypeScript frontend for a Compliance Checker. Stack: React, TypeScript, Tailwind CSS, Lucide React (icons), Axios. Backend Endpoints:
>
> - Checklist Service (Java): `http://localhost:8080/api/checklists`
> - Analyzer Service (C#): `http://localhost:5xxx/analyze/match` (I will adjust port).
>
> **Task:** Create a 'Dashboard' component with the following workflow:
> 1. Fetch and display the checklist items grouped by category.
> 2. When a user clicks an item, show a modal or side panel.
> 3. In the panel, allow pasting text (Document content).
> 4. 'Analyze' button: Sends text + requirement to C# Analyzer Service.
> 5. Show the result (Green check if match, Red X if not, plus reasoning).
> 6. If match, call Java Service to update status to 'passed'.
> 7. Show a global Progress Bar at the top.
>
> Provide the necessary components (Dashboard, ItemDetail, ProgressBar) and the API service functions."

## AI limitációk és workaround-ok
-Mivel az összetett feladatoknál az AI hajlamos a pontatlanságra, a "step-by-step" megközelítést alkalmazom. A problémákat kisebb, egymásra épülő modulokra bontom, így biztosítva a stabil alapokat. Ezzel minimalizálom az utólagos hibajavítás (debug) kockázatát és időigényét

## Fejlesztési sebesség
- **Boilerplate csökkentés:** A Dockerfile-ok, `docker-compose.yml` és Spring/ASP.NET vázak szinte azonnal elkészültek.
- **Endpoint:** A Java és C# REST contractokat egyszerre kaptam meg a promptokból, minimális utómunkával.
- **Frontend layout:** A Tailwind-del kombinált React komponensek nagy részét a Copilot állította össze, nekem főleg az állapotkezelést és az API-drótozást kellett finomítani.
