# Evidence Analyzer Service

A .NET 8 minimal API that offers compliance insights in **five** ways:

- `POST /analyze/document` — summarize a document, extract keywords, and estimate risk.
- `POST /analyze/match` — compare a document excerpt with a requirement using OpenAI (or a deterministic heuristic fallback when no API key is set).
- `GET /analyze/gaps` — return curated missing controls for ISO 27001 or SOC 2.
- `GET /report/compliance/{checklistId}` — aggregate checklist stats, category breakdowns, and next actions.
- `GET /report/gaps/{checklistId}` + `POST /report/suggestions` — AI-assisted gap narratives and improvement plans using data pulled from the Java checklist service.

## Configuration

Update `appsettings.json` (or `appsettings.Development.json`) with your OpenAI credentials:

```
"OpenAI": {
  "ApiKey": "YOUR_OPENAI_API_KEY",
  "Model": "gpt-4o-mini",
  "Endpoint": "https://api.openai.com/v1/chat/completions"
}
```

> Never commit real API keys to source control—use [Secret Manager](https://learn.microsoft.com/aspnet/core/security/app-secrets) or environment variables in production.

## Run locally

```
dotnet run --project EvidenceAnalyzer.csproj
```

The API listens on the default Kestrel ports (HTTP/HTTPS) and allows CORS calls from `http://localhost:5173`.

## Endpoints

### `POST /analyze/document`

```json
{
  "documentText": "Policies must be reviewed annually...",
  "documentName": "Access Control SOP",
  "focusAreas": ["Access Control", "Privileged Access"],
  "evidenceTags": ["SOP", "Policy"]
}
```

Returns summary text, extracted keywords, per-focus-area coverage scores, key findings, and recommended next steps.

### `POST /analyze/match`

```json
{
  "requirement": "Password policy must mandate MFA",
  "documentText": "Section 3.2 describes MFA rollout...",
  "hints": ["password policy", "MFA"]
}
```

Response example:

```json
{
  "matches": true,
  "confidence": 0.85,
  "reasoning": "Document lists MFA enforcement for privileged users.",
  "relevant_sections": ["Section 3.2: MFA rollout"],
  "missing_elements": []
}
```

If OpenAI credentials are missing, the API falls back to a deterministic keyword-based heuristic so local testing still works.

### `GET /analyze/gaps`

Optional query parameters:

- `framework` — `ISO-27001` (default) or `SOC2`
- `focus` — filter by category or control ID substring

Returns timestamped gap suggestions with impact, recommended action, and evidence hints.

### `GET /report/compliance/{checklistId}`

Fetches the checklist from the Java service and returns totals, category summaries, completion %, and next steps.

### `GET /report/gaps/{checklistId}`

Returns outstanding checklist items plus an AI-generated summary highlighting uncovered requirements, partial coverage, priority gaps, and next steps.

### `POST /report/suggestions`

```json
{
  "checklistId": 1,
  "audience": "Executive",
  "focusAreas": ["Access Control", "Data Protection"],
  "evidenceHighlights": ["MFA logs", "Backup policy"],
  "tone": "actionable"
}
```

Responds with an executive summary, quick wins, remediation plan, template recommendations, and best practices. Powered by OpenAI when an API key is configured, otherwise a deterministic fallback keeps the endpoint usable offline.

Use the pre-populated `EvidenceAnalyzer.http` file for a quick smoke test via Visual Studio Code's REST client or `curl`.
