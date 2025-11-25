import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Upload, FileText, Loader2, Copy, Check } from 'lucide-react';
import type { ChecklistItem, Category, Checklist, GapAnalysisResult } from '../types';
import { fetchChecklists, analyzeDocument, updateItemStatus, fetchGapAnalysis } from '../services/api';
import ProgressBar from './ProgressBar';
import { normalizeStatus } from '../utils/status';

type ProcessingResult = {
  success: boolean;
  reasoning: string;
  improvementSuggestion?: string | null;
  recommendedText?: string | null;
};

type ChecklistWithCategories = Checklist & { categories: Category[] };
type SeverityLevel = 'critical' | 'high' | 'medium';
type PriorityQueueEntry = {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
};

const getCategoryKey = (checklistId: number, categoryName: string) =>
  `${checklistId}::${categoryName}`;

const normalizeSeverity = (value?: string): SeverityLevel => {
  switch (value?.toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    default:
      return 'medium';
  }
};

const Dashboard: React.FC = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Document upload and processing states
  const [documentContent, setDocumentContent] = useState('');
  const [uploadLocked, setUploadLocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingItem, setCurrentProcessingItem] = useState<ChecklistItem | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [processingResults, setProcessingResults] = useState<Map<number, ProcessingResult>>(new Map());
  const [copiedResultId, setCopiedResultId] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Gap analysis state
  const [gapChecklistId, setGapChecklistId] = useState<number | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  const [hasDocumentAnalysisRun, setHasDocumentAnalysisRun] = useState(false);

  const items = useMemo<ChecklistItem[]>(() => {
    return checklists.flatMap(checklist => checklist.items);
  }, [checklists]);

  const updateItemStatusLocally = (itemId: number, newStatus: 'pending' | 'passed' | 'failed') => {
    setChecklists(prevChecklists =>
      prevChecklists.map(checklist => ({
        ...checklist,
        items: checklist.items.map(item =>
          item.id === itemId ? { ...item, status: newStatus } : item
        ),
      }))
    );
  };

  // Fetch checklist items on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const data = await fetchChecklists();
        setChecklists(data);
        setError(null);
      } catch (err) {
        setError('Failed to load checklist items. Please ensure the backend service is running.');
        console.error('Error loading items:', err);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  // Initialize default checklist for gap analysis once data arrives
  useEffect(() => {
    if (checklists.length > 0 && gapChecklistId === null) {
      setGapChecklistId(checklists[0].id);
    }
  }, [checklists, gapChecklistId]);

  useEffect(() => {
    setGapAnalysis(null);
    setGapError(null);
    setHasDocumentAnalysisRun(false);
  }, [gapChecklistId]);

  const runGapAnalysis = useCallback(async () => {
    if (!gapChecklistId) {
      setGapAnalysis(null);
      setGapError(null);
      return;
    }

    try {
      setGapLoading(true);
      setGapError(null);
      setGapAnalysis(null);
      const result = await fetchGapAnalysis(gapChecklistId);
      setGapAnalysis(result);
    } catch (err) {
      console.error('Error loading gap analysis:', err);
      setGapAnalysis(null);
      setGapError('Failed to load gap analysis. Ensure the analyzer service is running.');
    } finally {
      setGapLoading(false);
    }
  }, [gapChecklistId]);


  // Group checklists and their items by category straight from the API payload
  const checklistViews = useMemo<ChecklistWithCategories[]>(() => {
    return checklists.map(checklist => {
      const categoryMap = new Map<string, ChecklistItem[]>();

      // Sort items by ID to ensure category creation order follows the logical ID order
      // This ensures Incident Management (200s) comes before Data Protection (300s)
      const sortedItems = [...checklist.items].sort((a, b) => a.id - b.id);

      sortedItems.forEach(item => {
        const categoryName = item.category || 'Uncategorized';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, []);
        }
        categoryMap.get(categoryName)!.push(item);
      });

      const categories: Category[] = Array.from(categoryMap.entries())
        .map(([name, groupedItems]) => ({
          name,
          items: groupedItems,
        }));

      return {
        ...checklist,
        categories,
      };
    });
  }, [checklists]);

  const itemLookup = useMemo(() => {
    return new Map(items.map(item => [item.id, item]));
  }, [items]);

  const orderedProcessingResults = useMemo(() => {
    return Array.from(processingResults.entries()).sort((a, b) => a[0] - b[0]);
  }, [processingResults]);

  const priorityQueueItems = useMemo<PriorityQueueEntry[]>(() => {
    if (!gapAnalysis) {
      return [];
    }

    const aiItems = (gapAnalysis.aiSummary?.priorityGaps ?? []).map((gap, index) => ({
      id: `ai-${index}-${gap.requirement}`,
      title: gap.requirement,
      description: gap.recommendation,
      severity: normalizeSeverity(gap.severity),
    } satisfies PriorityQueueEntry));

    const outstandingItems = (gapAnalysis.gaps ?? []).map(gap => ({
      id: `gap-${gap.requirementId}`,
      title: gap.description || gap.requirementId,
      description: gap.suggestedAction,
      severity: normalizeSeverity(gap.impact),
    } satisfies PriorityQueueEntry));

    const merged = [...aiItems];
    outstandingItems.forEach(item => {
      const alreadyIncluded = merged.some(existing => existing.id === item.id || existing.title === item.title);
      if (!alreadyIncluded) {
        merged.push(item);
      }
    });

    return merged;
  }, [gapAnalysis]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = items.length;
    const passed = items.filter(item => item.status === 'passed').length;
    const failed = items.filter(item => item.status === 'failed').length;
    const pending = items.filter(item => item.status === 'pending').length;
    
    return { total, passed, failed, pending };
  }, [items]);

  // Toggle category collapse
  const toggleCategory = (categoryKey: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  // Handle document file upload
  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadLocked) {
      setError('Please click Reset before uploading another document.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDocumentContent(content);
      setUploadLocked(true);
      setError(null);
    };
    reader.readAsText(file);
  };

  // Reset for new document testing
  const handleReset = async () => {
    setDocumentContent('');
    setProcessingResults(new Map());
    setProcessedCount(0);
    setTotalToProcess(0);
    setCurrentProcessingItem(null);
    setError(null);
    setUploadLocked(false);
    setHasDocumentAnalysisRun(false);
    setGapAnalysis(null);
    setGapError(null);
    setGapLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Reset all items back to pending status
    try {
      const resetPromises = items.map(item => 
        updateItemStatus(item.checklistId, item.id, 'pending')
      );
      await Promise.all(resetPromises);
      
      // Update local state
      setChecklists(prevChecklists =>
        prevChecklists.map(checklist => ({
          ...checklist,
          items: checklist.items.map(item => ({ ...item, status: 'pending' as const })),
        }))
      );
    } catch (err) {
      console.error('Error resetting items:', err);
      setError('Something went wrong while resetting the checklist items.');
    }
  };

  const copyRecommendedText = async (itemId: number, text?: string | null) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedResultId(itemId);
      window.setTimeout(() => {
        setCopiedResultId(prev => (prev === itemId ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy recommended text:', err);
    }
  };

  // Process all pending items with the uploaded document
  const processAllItems = async () => {
    if (!documentContent.trim()) {
      setError('Please upload a document before running the analysis.');
      return;
    }

    const pendingItems = items.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      setError('There are no pending items to process.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);
    setTotalToProcess(pendingItems.length);
    setProcessingResults(new Map());

    for (const item of pendingItems) {
      setCurrentProcessingItem(item);

      try {
        // Analyze document against requirement
        const result = await analyzeDocument({
          requirement: item.requirement,
          documentText: documentContent,
          hints: item.hints ?? [],
        });

        // Update status based on analysis result
        const newStatus = result.isMatch ? 'passed' : 'failed';
        
        // Console output with AI analysis result
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🤖 AI ANALYSIS - Item #${item.id}`);
        console.log(`📋 Requirement: ${item.requirement}`);
        console.log(`✅ Outcome: ${result.isMatch ? '✓ PASSED (AI generated)' : '✗ FAILED (AI generated)'}`);
        console.log(`💡 Rationale:\n${result.reasoning}`);
        if (result.confidence) {
          console.log(`📊 Confidence: ${Math.round(result.confidence * 100)}%`);
        }
        if (result.relevantSections && result.relevantSections.length > 0) {
          console.log('📄 Relevant sections:', result.relevantSections);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        await updateItemStatus(item.checklistId, item.id, newStatus);
        
        // Update local state
        updateItemStatusLocally(item.id, newStatus);

        // Store result
        setProcessingResults(prev => new Map(prev).set(item.id, {
          success: result.isMatch,
          reasoning: result.reasoning,
          improvementSuggestion: result.improvementSuggestion ?? null,
          recommendedText: result.recommendedText ?? null,
        }));
      } catch (err) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ ERROR - Item #${item.id}`);
        console.log(`📋 Requirement: ${item.requirement}`);
        console.log('⚠️ The AI analysis threw an error:', err);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        setProcessingResults(prev => new Map(prev).set(item.id, {
          success: false,
          reasoning: 'An unexpected error occurred during the analysis.',
          improvementSuggestion: null,
          recommendedText: null,
        }));
      }

      setProcessedCount(prev => prev + 1);
    }

    setHasDocumentAnalysisRun(true);
    await runGapAnalysis();
    setCurrentProcessingItem(null);
    setIsProcessing(false);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    const safeStatus = normalizeStatus(status);
    switch (safeStatus) {
      case 'passed':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'failed':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-yellow-600" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-orange-100 text-orange-800 border-orange-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getSeverityBadgeClass = (severity: string) => {
    if (!severity) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }

    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading compliance checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Compliance Checker</h1>
              <p className="mt-2 text-slate-300 text-lg">
                Automated verification & compliance tracking
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm font-medium">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Items</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Passed</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{stats.passed}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500 transform transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Failed</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{stats.failed}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <ProgressBar total={stats.total} completed={stats.passed} />
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Document Analysis</h2>
              <p className="text-sm text-gray-500">Upload a document to automatically verify compliance requirements</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* File upload */}
            <div className="relative group">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                documentContent ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleDocumentUpload}
                  disabled={isProcessing || uploadLocked}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  {documentContent ? (
                    <>
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle size={32} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-green-900">Document Loaded</p>
                        <p className="text-sm text-green-700 mt-1">Ready for analysis</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-100 rounded-full group-hover:scale-110 transition-transform">
                        <Upload size={32} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">Drop your document here</p>
                        <p className="text-sm text-gray-500 mt-1">or click to browse (.txt files)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {(documentContent || processingResults.size > 0) && !isProcessing && (
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm border border-gray-200 transition-colors flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Document preview */}
            {documentContent && !isProcessing && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-100 flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document Preview</span>
                  <span className="text-xs text-gray-500">
                    {documentContent.length} chars • {items.filter(i => i.status === 'pending').length} pending items
                  </span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">
                    {documentContent.substring(0, 500)}{documentContent.length > 500 ? '...' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Process button */}
            <div className="flex justify-end">
              <button
                onClick={processAllItems}
                disabled={!documentContent || isProcessing}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing... ({processedCount}/{totalToProcess})
                  </>
                ) : (
                  <>
                    <div className="p-1 bg-white/20 rounded">
                      <Upload size={16} />
                    </div>
                    Run Automated Analysis
                  </>
                )}
              </button>
            </div>

            {/* Processing status */}
            {isProcessing && currentProcessingItem && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Loader2 size={24} className="text-blue-600 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold text-blue-900">
                        Processing item #{currentProcessingItem.id}
                      </p>
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        {Math.round((processedCount / totalToProcess) * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">
                      {currentProcessingItem.requirement}
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(processedCount / totalToProcess) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results summary */}
            {!isProcessing && processingResults.size > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Analysis Summary</h3>
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4">
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                      <CheckCircle size={16} />
                      Passed: {Array.from(processingResults.values()).filter(r => r.success).length}
                    </div>
                    <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium flex items-center gap-2">
                      <XCircle size={16} />
                      Failed: {Array.from(processingResults.values()).filter(r => !r.success).length}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {orderedProcessingResults.map(([itemId, result]) => {
                      const relatedItem = itemLookup.get(itemId);
                      return (
                        <div
                          key={itemId}
                          className={`p-5 rounded-xl border shadow-sm transition-all ${
                            result.success 
                              ? 'border-green-200 bg-white hover:border-green-300' 
                              : 'border-red-200 bg-white hover:border-red-300'
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{itemId}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {result.success ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <p className="text-base font-semibold text-gray-900">
                                  {relatedItem?.requirement ?? 'Unknown requirement'}
                                </p>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">AI Reasoning</p>
                              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                {result.reasoning}
                              </p>
                            </div>

                            {!result.success && (
                              <div className="mt-2 space-y-3">
                                {result.improvementSuggestion && (
                                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                                      <span role="img" aria-label="improvement">💡</span> Recommended Action
                                    </p>
                                    <p className="text-sm text-amber-900">
                                      {result.improvementSuggestion}
                                    </p>
                                  </div>
                                )}
                                {result.recommendedText && (
                                  <div className="relative group">
                                    <div className="flex justify-between items-center mb-2">
                                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Suggested Wording</p>
                                      <button
                                        type="button"
                                        onClick={() => copyRecommendedText(itemId, result.recommendedText)}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                      >
                                        {copiedResultId === itemId ? (
                                          <>
                                            <Check size={14} />
                                            Copied!
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={14} />
                                            Copy to clipboard
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="bg-slate-800 text-slate-200 text-sm font-mono rounded-lg p-4 whitespace-pre-wrap overflow-x-auto border border-slate-700 shadow-inner">
                                      {result.recommendedText}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* AI Gap Analysis */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Gap Analysis</p>
                <h2 className="text-2xl font-bold text-gray-900">AI Prioritized Gaps</h2>
                <p className="text-sm text-gray-500 mt-1">Live analysis powered by the analyzer service.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600" htmlFor="gap-checklist-select">Checklist</label>
                <select
                  id="gap-checklist-select"
                  value={gapChecklistId ?? ''}
                  onChange={(event) => setGapChecklistId(Number(event.target.value) || null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {checklists.map(checklist => (
                    <option key={checklist.id} value={checklist.id}>
                      {checklist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!hasDocumentAnalysisRun ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                Run the document analysis above to generate a fresh AI gap summary for this checklist.
              </div>
            ) : (
              <>
                {gapError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">{gapError}</p>
                  </div>
                )}

                {gapLoading ? (
                  <div className="flex items-center gap-3 text-purple-700 bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <Loader2 size={20} className="animate-spin" />
                    <p className="text-sm font-medium">Generating AI summary...</p>
                  </div>
                ) : gapAnalysis ? (
                  <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Uncovered</p>
                    <ul className="space-y-1 text-sm text-purple-900">
                      {gapAnalysis.aiSummary.uncoveredRequirements.length === 0 && (
                        <li>No uncovered controls 🎉</li>
                      )}
                      {gapAnalysis.aiSummary.uncoveredRequirements.map((req, index) => (
                        <li key={`uncovered-${index}`}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Partial Coverage</p>
                    <ul className="space-y-1 text-sm text-amber-900">
                      {gapAnalysis.aiSummary.partialCoverage.length === 0 && (
                        <li>All partially covered requirements are addressed.</li>
                      )}
                      {gapAnalysis.aiSummary.partialCoverage.map((req, index) => (
                        <li key={`partial-${index}`}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Next Steps</p>
                    <ul className="space-y-1 text-sm text-blue-900 list-disc list-inside">
                      {gapAnalysis.aiSummary.nextSteps.length === 0 && (
                        <li>No recommendations reported.</li>
                      )}
                      {gapAnalysis.aiSummary.nextSteps.map((step, index) => (
                        <li key={`next-step-${index}`}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <p className="text-sm font-semibold text-gray-700 mb-3">AI Priority Queue</p>
                      {priorityQueueItems.length === 0 ? (
                        <p className="text-sm text-gray-500">All controls are covered. Run document analysis to refresh priorities.</p>
                      ) : (
                        <div className="space-y-3">
                          {priorityQueueItems.map(item => (
                            <div key={item.id} className="flex items-start justify-between gap-4 border border-gray-100 rounded-lg p-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityBadgeClass(item.severity)}`}>
                                {item.severity.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">Outstanding Controls</p>
                      {gapAnalysis.gaps.length === 0 ? (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-green-800 text-sm">
                          All controls are currently satisfied.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {gapAnalysis.gaps.map(gap => (
                            <div key={gap.requirementId} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-base font-semibold text-gray-900">{gap.requirementId}</h4>
                                <span className="text-xs font-medium text-gray-500">{gap.category}</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-3">{gap.description}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getSeverityBadgeClass(gap.impact)}`}>
                                  {gap.impact}
                                </span>
                                <span className="text-xs text-gray-500">Action: {gap.suggestedAction}</span>
                              </div>
                              {gap.evidenceHints.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase">Evidence Hints</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {gap.evidenceHints.map((hint, index) => (
                                      <span key={`${gap.requirementId}-hint-${index}`} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                                        {hint}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Select a checklist to generate the AI gap analysis.</div>
                )}
              </>
            )}
          </div>
        </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items grouped exactly as delivered by the API */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-8">
          {checklistViews.map(checklist => (
            <div key={checklist.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Checklist</p>
                  <h2 className="text-2xl font-bold text-gray-900">{checklist.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Compliance Score</p>
                    <p className="text-xs text-gray-500">
                      {checklist.items.filter(item => item.status === 'passed').length} of {checklist.items.length} passed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white border-4 border-gray-100 flex items-center justify-center shadow-sm">
                    <span className="text-xs font-bold text-gray-700">
                      {Math.round((checklist.items.filter(item => item.status === 'passed').length / checklist.items.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {checklist.categories.map(category => {
                  const categoryKey = getCategoryKey(checklist.id, category.name);
                  const passedCount = category.items.filter(i => i.status === 'passed').length;
                  const isCollapsed = collapsedCategories.has(categoryKey);

                  return (
                    <div key={categoryKey} className="group">
                      <button
                        onClick={() => toggleCategory(categoryKey)}
                        className="w-full px-8 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-1 rounded-md transition-colors ${isCollapsed ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                            {isCollapsed ? (
                              <ChevronRight size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{category.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{category.items.length} requirements</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(passedCount / category.items.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600 w-12 text-right">
                            {passedCount}/{category.items.length}
                          </span>
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="bg-gray-50/30 border-t border-gray-100">
                          {category.items.map(item => {
                            const status = normalizeStatus(item.status);
                            const requirementText = item.requirement || 'Requirement unavailable';

                            return (
                              <div
                                key={item.id}
                                className="px-8 py-5 bg-white transition-all duration-200 border-b border-gray-100 last:border-0 relative"
                              >
                                <div className="flex items-start gap-5">
                                  <div className="flex-shrink-0 mt-1">
                                    {getStatusIcon(status)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="text-xs font-mono text-gray-400">#{item.id}</span>
                                      {getPriorityBadge(item.priority)}
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        status === 'passed'
                                          ? 'bg-green-100 text-green-700'
                                          : status === 'failed'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {status}
                                      </span>
                                    </div>
                                    <p className="text-gray-900 font-medium leading-relaxed">{requirementText}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {checklist.categories.length === 0 && (
                  <div className="px-8 py-8 text-center text-gray-500 bg-gray-50">
                    <p>No categories available for this checklist yet.</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {checklistViews.length === 0 && !error && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No checklist items found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                It looks like there are no items in your checklist yet. Add some items to get started with the compliance verification.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
