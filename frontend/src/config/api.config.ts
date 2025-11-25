// Configuration file for API endpoints
// Override the defaults with Vite env vars when needed

const CHECKLIST_BASE_URL = import.meta.env.VITE_CHECKLIST_SERVICE_URL ?? 'http://localhost:8080';
const ANALYZER_BASE_URL = import.meta.env.VITE_ANALYZER_SERVICE_URL ?? 'http://localhost:5058';

export const API_CONFIG = {
  // Java Checklist Service
  checklistService: {
    baseUrl: CHECKLIST_BASE_URL,
    endpoints: {
      checklists: '/api/checklists',
      updateStatus: (checklistId: number, itemId: number) => `/api/checklists/${checklistId}/items/${itemId}/status`,
    },
  },
  
  // C# Analyzer Service
  analyzerService: {
    baseUrl: ANALYZER_BASE_URL,
    endpoints: {
      analyzeMatch: '/analyze/match',
      analyzeGaps: '/analyze/gaps',
    },
  },
  
  // Timeout settings (in milliseconds)
  timeout: {
    standard: 10000,  // 10 seconds
    analysis: 30000,  // 30 seconds for document analysis
  },
};

// Helper to get full URLs
export const getChecklistUrl = () => 
  `${API_CONFIG.checklistService.baseUrl}${API_CONFIG.checklistService.endpoints.checklists}`;

export const getAnalyzerUrl = () => 
  `${API_CONFIG.analyzerService.baseUrl}${API_CONFIG.analyzerService.endpoints.analyzeMatch}`;

export const getUpdateStatusUrl = (checklistId: number, itemId: number) => 
  `${API_CONFIG.checklistService.baseUrl}${API_CONFIG.checklistService.endpoints.updateStatus(checklistId, itemId)}`;
