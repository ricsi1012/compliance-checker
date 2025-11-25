import axios from 'axios';
import type {
  ChecklistItem,
  ChecklistApiResponse,
  ChecklistApiItem,
  AnalysisRequest,
  AnalysisResult,
  UpdateStatusRequest,
  Checklist,
  GapAnalysisResult,
  GapInsight,
  GapAnalysisAiSummary,
  PriorityGap,
} from '../types';
import { API_CONFIG } from '../config/api.config';
import { normalizeStatus } from '../utils/status';

interface AnalyzerMatchResponse {
  matches: boolean;
  confidence?: number;
  reasoning: string;
  relevant_sections?: string[];
  relevantSections?: string[];
  improvement_suggestion?: string | null;
  improvementSuggestion?: string | null;
  recommended_text?: string | null;
  recommendedText?: string | null;
}

interface GapAnalysisApiResponse {
  framework: string;
  generatedAt: string;
  gaps: Array<GapAnalysisApiGap>;
  aiSummary: GapAnalysisApiSummary;
}

interface GapAnalysisApiGap {
  requirementId: string;
  category: string;
  description: string;
  impact: string;
  suggestedAction: string;
  evidenceHints?: string[];
}

interface GapAnalysisApiSummary {
  uncovered_requirements?: string[];
  partial_coverage?: string[];
  priority_gaps?: Array<{
    requirement: string;
    severity: string;
    recommendation: string;
  }>;
  next_steps?: string[];
}

// Create axios instances
const checklistApi = axios.create({
  baseURL: API_CONFIG.checklistService.baseUrl,
  timeout: API_CONFIG.timeout.standard,
  headers: {
    'Content-Type': 'application/json',
  },
});

const analyzerApi = axios.create({
  baseURL: API_CONFIG.analyzerService.baseUrl,
  timeout: API_CONFIG.timeout.analysis,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all checklists (with their items) from the Java service
 */
export const fetchChecklists = async (): Promise<Checklist[]> => {
  try {
    const response = await checklistApi.get<ChecklistApiResponse[]>(
      API_CONFIG.checklistService.endpoints.checklists
    );

    const checklists = response.data ?? [];
    return checklists.map(checklist => ({
      id: checklist.id,
      name: checklist.name,
      items: (checklist.items ?? []).map(item => ({
        id: item.id,
        checklistId: checklist.id,
        category: item.category,
        requirement: item.requirement,
        status: normalizeStatus(item.status),
        hints: item.hints ?? [],
        priority: item.priority,
        evidence: item.evidence ?? [],
      })),
    }));
  } catch (error) {
    console.error('Error fetching checklists:', error);
    throw error;
  }
};

/**
 * Convenience helper to get a flattened checklist item list
 */
export const fetchChecklistItems = async (): Promise<ChecklistItem[]> => {
  const checklists = await fetchChecklists();
  return checklists.flatMap(checklist => checklist.items);
};

/**
 * Analyze document content against a requirement using C# Analyzer Service
 */
export const analyzeDocument = async (
  request: AnalysisRequest
): Promise<AnalysisResult> => {
  try {
    const response = await analyzerApi.post<AnalyzerMatchResponse>(
      API_CONFIG.analyzerService.endpoints.analyzeMatch,
      request
    );
    const data = response.data;
    return {
      isMatch: data.matches,
      reasoning: data.reasoning,
      confidence: data.confidence,
      relevantSections: data.relevant_sections ?? data.relevantSections ?? [],
      improvementSuggestion: data.improvement_suggestion ?? data.improvementSuggestion ?? null,
      recommendedText: data.recommended_text ?? data.recommendedText ?? null,
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw error;
  }
};

/**
 * Update the status of a checklist item
 */
export const updateItemStatus = async (
  checklistId: number,
  itemId: number,
  status: 'pending' | 'passed' | 'failed'
): Promise<ChecklistItem> => {
  try {
    const request: UpdateStatusRequest = { status: status.toUpperCase() as UpdateStatusRequest['status'] };
    const response = await checklistApi.put<ChecklistApiItem>(
      API_CONFIG.checklistService.endpoints.updateStatus(checklistId, itemId),
      request
    );
    const updatedItem = response.data;
    return {
      id: updatedItem.id,
      checklistId,
      category: updatedItem.category,
      requirement: updatedItem.requirement,
      status: normalizeStatus(updatedItem.status),
      hints: updatedItem.hints ?? [],
      priority: updatedItem.priority,
      evidence: updatedItem.evidence ?? [],
    };
  } catch (error) {
    console.error('Error updating item status:', error);
    throw error;
  }
};

/**
 * Update the Analyzer Service URL (for dynamic port configuration)
 */
export const setAnalyzerServiceUrl = (url: string) => {
  analyzerApi.defaults.baseURL = url;
};

/**
 * Fetch AI-backed gap analysis for a checklist or framework
 */
export const fetchGapAnalysis = async (checklistId?: number): Promise<GapAnalysisResult> => {
  try {
    const response = await analyzerApi.get<GapAnalysisApiResponse>(
      API_CONFIG.analyzerService.endpoints.analyzeGaps,
      { params: checklistId ? { checklistId } : undefined }
    );

    return {
      framework: response.data.framework,
      generatedAt: response.data.generatedAt,
      gaps: (response.data.gaps ?? []).map(mapGapApiToModel),
      aiSummary: mapGapSummary(response.data.aiSummary),
    };
  } catch (error) {
    console.error('Error fetching gap analysis:', error);
    throw error;
  }
};

const mapGapApiToModel = (gap: GapAnalysisApiGap): GapInsight => ({
  requirementId: gap.requirementId,
  category: gap.category,
  description: gap.description,
  impact: gap.impact,
  suggestedAction: gap.suggestedAction,
  evidenceHints: gap.evidenceHints ?? [],
});

const mapGapSummary = (summary: GapAnalysisApiSummary): GapAnalysisAiSummary => ({
  uncoveredRequirements: summary.uncovered_requirements ?? [],
  partialCoverage: summary.partial_coverage ?? [],
  priorityGaps: (summary.priority_gaps ?? []).map(mapPriorityGap),
  nextSteps: summary.next_steps ?? [],
});

const mapPriorityGap = (gap: { requirement: string; severity: string; recommendation: string }): PriorityGap => ({
  requirement: gap.requirement,
  severity: (gap.severity?.toLowerCase?.() as PriorityGap['severity']) ?? 'medium',
  recommendation: gap.recommendation,
});
