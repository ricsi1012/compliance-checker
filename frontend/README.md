# Compliance Checker Frontend

A React + TypeScript frontend application for tracking and verifying compliance requirements.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client
- **Vite** - Build tool

## Features

- **Dashboard View**: Display all compliance checklist items grouped by category
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Document Analysis**: Upload and analyze documents against requirements
- **AI-Powered Matching**: Integration with C# Analyzer Service for intelligent document verification
- **Status Management**: Automatic status updates when requirements are met
- **Category Organization**: Collapsible category sections for better organization
- **Priority Indicators**: Visual priority badges (High, Medium, Low)

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx      # Main dashboard component
│   │   ├── ItemDetail.tsx     # Modal for document analysis
│   │   └── ProgressBar.tsx    # Progress visualization
│   ├── services/
│   │   └── api.ts             # API service functions
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Running Java Checklist Service (port 8080)
- Running C# Analyzer Service (port 5000 or custom)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure backend URLs (if needed):

Copy `.env.example` to `.env` and override the service URLs when your ports differ from the defaults:
```bash
cp .env.example .env
# then edit .env
VITE_CHECKLIST_SERVICE_URL=http://localhost:8080
VITE_ANALYZER_SERVICE_URL=http://localhost:5058
```
The defaults match `mvn spring-boot:run` (8080) and `dotnet run` (5058). Update them if you expose the APIs on different ports.

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Usage

### 1. View Checklist Items

The dashboard displays all compliance requirements grouped by category:
- Click category headers to expand/collapse sections
- View item status (Pending, Passed, Failed)
- See priority levels and requirement text

### 2. Analyze Documents

Click on any checklist item to open the analysis modal:
1. **Paste Document Content**: Copy and paste your document text
2. **Click "Analyze Document"**: Sends content to the AI analyzer
3. **View Results**: 
   - ✅ Green check = Match found (status auto-updated to "passed")
   - ❌ Red X = No match
   - See detailed reasoning from the AI

### 3. Track Progress

- Global progress bar shows completion percentage
- Statistics cards display total, passed, pending, and failed counts
- Category-level progress indicators

## API Integration

### Checklist Service (Java - Port 8080)

**Fetch all checklist items:**
```
GET http://localhost:8080/api/checklists
```

**Update item status:**
```
PUT http://localhost:8080/api/checklists/{id}/status
Body: { "status": "passed" | "failed" | "pending" }
```

### Analyzer Service (C# - Port 5000)

**Analyze document:**
```
POST http://localhost:5000/analyze/match
Body: {
  "requirement": "string",
  "documentContent": "string"
}
Response: {
  "isMatch": boolean,
  "reasoning": "string",
  "confidence": number (optional)
}
```

## TypeScript Interfaces

```typescript
interface ChecklistItem {
  id: number;
  requirementText: string;
  category: string;
  status: 'pending' | 'passed' | 'failed';
  priority?: 'high' | 'medium' | 'low';
}

interface AnalysisResult {
  isMatch: boolean;
  reasoning: string;
  confidence?: number;
}
```

## Troubleshooting

**"Failed to load checklist items"**
- Ensure Java Checklist Service is running on port 8080
- Check CORS configuration on backend

**"Failed to analyze document"**
- Verify C# Analyzer Service is running
- Check the analyzer URL in `api.ts`
- Review browser console for network errors
