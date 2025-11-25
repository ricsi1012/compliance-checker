// Type definitions for Compliance Checker

export interface ChecklistApiItem {
  id: number;
  category: string;
  requirement: string;
  status: 'pending' | 'passed' | 'failed';
  hints?: string[];
  evidence?: string[];
  priority?: 'high' | 'medium' | 'low';
}

export interface ChecklistApiResponse {
  id: number;
  name: string;
  items: ChecklistApiItem[];
}

export interface ChecklistItem {
  id: number;
  checklistId: number;
  category: string;
  requirement: string;
  status: ChecklistStatus;
  priority?: 'high' | 'medium' | 'low';
  hints: string[];
  evidence?: string[];
}

export interface Checklist {
  id: number;
  name: string;
  items: ChecklistItem[];
}

export interface Category {
  name: string;
  items: ChecklistItem[];
}

export interface AnalysisRequest {
  requirement: string;
  documentText: string;
  hints?: string[];
}

export interface AnalysisResult {
  isMatch: boolean;
  reasoning: string;
  confidence?: number;
  relevantSections?: string[];
  improvementSuggestion?: string | null;
  recommendedText?: string | null;
}

export interface GapInsight {
  requirementId: string;
  category: string;
  description: string;
  impact: string;
  suggestedAction: string;
  evidenceHints: string[];
}

export interface PriorityGap {
  requirement: string;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface GapAnalysisAiSummary {
  uncoveredRequirements: string[];
  partialCoverage: string[];
  priorityGaps: PriorityGap[];
  nextSteps: string[];
}

export interface GapAnalysisResult {
  framework: string;
  generatedAt: string;
  gaps: GapInsight[];
  aiSummary: GapAnalysisAiSummary;
}

export interface UpdateStatusRequest {
  status: ChecklistStatusPayload;
}

export type ChecklistStatus = 'pending' | 'passed' | 'failed';
export type ChecklistStatusPayload = Uppercase<ChecklistStatus>;
