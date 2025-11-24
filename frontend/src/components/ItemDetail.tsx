import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import type { ChecklistItem, AnalysisResult } from '../types';
import { analyzeDocument, updateItemStatus } from '../services/api';
import { normalizeStatus } from '../utils/status';

interface ItemDetailProps {
  item: ChecklistItem;
  onClose: () => void;
  onStatusUpdate: (itemId: number, newStatus: 'pending' | 'passed' | 'failed') => void;
}

const ItemDetail: React.FC<ItemDetailProps> = ({ item, onClose, onStatusUpdate }) => {
  const [documentContent, setDocumentContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requirementText = item.requirement ?? '';

  const handleAnalyze = async () => {
    if (!documentContent.trim()) {
      setError('Please paste document content before analyzing.');
      return;
    }

    if (!requirementText.trim()) {
      setError('This checklist item is missing a requirement, so it cannot be analyzed.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Call analyzer service
      const result = await analyzeDocument({
        requirement: requirementText,
        documentText: documentContent,
        hints: item.hints ?? [],
      });
      setAnalysisResult(result);

      // If match, update status to 'passed' in backend
      if (result.isMatch) {
        await updateItemStatus(item.checklistId, item.id, 'passed');
        onStatusUpdate(item.id, 'passed');
      }
    } catch (err) {
      setError('Failed to analyze document. Please check the analyzer service is running.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const safeStatus = normalizeStatus(status);
    switch (safeStatus) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-6 flex justify-between items-start z-10">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Requirement #{item.id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(item.status)}`}>
                {normalizeStatus(item.status)}
              </span>
              {item.priority && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  item.priority === 'high' ? 'bg-red-100 text-red-700' :
                  item.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {item.priority} Priority
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Compliance Check Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-8 flex-1 overflow-y-auto">
          {/* Requirement */}
          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
              <FileText size={16} className="text-blue-600" />
              Requirement Description
            </h3>
            <p className="text-lg text-gray-900 font-medium leading-relaxed">
              {requirementText || 'Requirement unavailable'}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Category:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                {item.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Document Content</h3>
                <span className="text-xs text-gray-500">Paste text to analyze</span>
              </div>
              <div className="relative">
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Paste the relevant section of your document here..."
                  className="w-full h-64 px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed transition-shadow shadow-inner"
                  disabled={isAnalyzing}
                />
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !documentContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        Run Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Right Column: Results */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Analysis Results</h3>
              
              {!analysisResult ? (
                <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                  <FileText size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No analysis run yet</p>
                  <p className="text-xs mt-1">Enter text and click Analyze</p>
                </div>
              ) : (
                <div className={`h-64 overflow-y-auto rounded-xl border p-6 ${
                  analysisResult.isMatch 
                    ? 'bg-green-50/50 border-green-200' 
                    : 'bg-red-50/50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {analysisResult.isMatch ? (
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle size={24} className="text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-100 rounded-full">
                        <XCircle size={24} className="text-red-600" />
                      </div>
                    )}
                    <div>
                      <h4 className={`text-lg font-bold ${analysisResult.isMatch ? 'text-green-900' : 'text-red-900'}`}>
                        {analysisResult.isMatch ? 'Requirement Met' : 'Requirement Not Met'}
                      </h4>
                      {analysisResult.confidence !== undefined && (
                        <p className={`text-xs font-medium ${analysisResult.isMatch ? 'text-green-700' : 'text-red-700'}`}>
                          Confidence: {Math.round(analysisResult.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Reasoning</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {analysisResult.reasoning}
                      </p>
                    </div>

                    {analysisResult.relevantSections && analysisResult.relevantSections.length > 0 && (
                      <div className="pt-3 border-t border-gray-200/50">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Evidence Found</p>
                        <ul className="space-y-2">
                          {analysisResult.relevantSections.map((section, index) => (
                            <li key={index} className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 italic">
                              "{section}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 rounded-lg border border-gray-300 shadow-sm transition-colors text-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
