# Compliance Checker - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Backend Services

**Java Checklist Service:**
```bash
cd checklist-service
mvn spring-boot:run
# Should run on http://localhost:8080
```

**C# Analyzer Service:**
```bash
cd evidence-analyzer/EvidenceAnalyzer
dotnet run
# Should run on http://localhost:5000 (or check console for port)
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## 📋 Component Overview

### Dashboard Component
- **Location**: `src/components/Dashboard.tsx`
- **Purpose**: Main view displaying all checklist items grouped by category
- **Features**:
  - Fetches data from Java service on mount
  - Groups items by category with expand/collapse
  - Shows statistics (total, passed, pending, failed)
  - Handles item selection to open detail modal

### ItemDetail Component
- **Location**: `src/components/ItemDetail.tsx`
- **Purpose**: Modal for analyzing documents against requirements
- **Features**:
  - Text area for pasting document content
  - Analyze button sends request to C# service
  - Displays match result with reasoning
  - Auto-updates status to "passed" on match
  - Visual feedback (green check / red X)

### ProgressBar Component
- **Location**: `src/components/ProgressBar.tsx`
- **Purpose**: Visual progress indicator
- **Features**:
  - Shows completion percentage
  - Displays completed vs total counts
  - Animated progress bar

## 🔧 API Service Functions

### fetchChecklistItems()
- **Returns**: `Promise<ChecklistItem[]>`
- **Endpoint**: `GET http://localhost:8080/api/checklists`
- **Usage**:
```typescript
const items = await fetchChecklistItems();
```

### analyzeDocument(requirement, documentContent)
- **Returns**: `Promise<AnalysisResult>`
- **Endpoint**: `POST http://localhost:5000/analyze/match`
- **Usage**:
```typescript
const result = await analyzeDocument(
  "Requirement text",
  "Document content to analyze"
);
```

### updateItemStatus(itemId, status)
- **Returns**: `Promise<ChecklistItem>`
- **Endpoint**: `PUT http://localhost:8080/api/checklists/{id}/status`
- **Usage**:
```typescript
const updatedItem = await updateItemStatus(1, 'passed');
```

## 🎨 Customization

### Change Analyzer Service Port
In `src/services/api.ts`, update line 8:
```typescript
const ANALYZER_SERVICE_URL = 'http://localhost:YOUR_PORT/analyze/match';
```

### Modify Colors
Tailwind CSS classes are used throughout. Key colors:
- **Primary**: `blue-600` (buttons, progress)
- **Success**: `green-600` (passed items)
- **Danger**: `red-600` (failed items)
- **Warning**: `yellow-600` (pending items)

### Add New Fields to ChecklistItem
1. Update `src/types/index.ts`
2. Update backend DTOs to match
3. Update display in Dashboard and ItemDetail components

## 🐛 Common Issues

### CORS Errors
Add CORS configuration to your backend services:

**Java (Spring Boot):**
```java
@CrossOrigin(origins = "http://localhost:5173")
```

**C# (ASP.NET Core):**
```csharp
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
app.UseCors("AllowFrontend");
```

### Port Conflicts
- Frontend: Change in `vite.config.ts` → `server.port`
- Check backend console output for actual ports

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📦 Production Deployment

### Build Frontend
```bash
npm run build
# Output in dist/ folder
```

### Serve Static Files
```bash
npm install -g serve
serve -s dist -p 3000
```

### Update API URLs for Production
Before building, update `src/services/api.ts` with production URLs:
```typescript
const CHECKLIST_SERVICE_URL = 'https://your-api.com/api/checklists';
const ANALYZER_SERVICE_URL = 'https://your-analyzer.com/analyze/match';
```

## 🔐 Security Considerations

For production:
1. **Use HTTPS** for all services
2. **Add authentication** (JWT tokens)
3. **Validate inputs** on backend
4. **Rate limiting** on API endpoints
5. **Environment variables** for configuration

## 📝 Next Steps

Suggested enhancements:
- [ ] Add authentication/authorization
- [ ] Implement file upload for documents
- [ ] Add filtering and search functionality
- [ ] Export compliance reports (PDF/Excel)
- [ ] Add commenting on checklist items
- [ ] Implement audit trail/history
- [ ] Add batch analysis capability
- [ ] Real-time updates with WebSockets
