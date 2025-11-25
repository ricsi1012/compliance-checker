using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace EvidenceAnalyzer.Models;

public sealed record AnalyzeMatchRequest(
    string Requirement,
    string DocumentText,
    string[]? Hints
);

public sealed record AnalyzeMatchResponse(
    [property: JsonPropertyName("matches")] bool Matches,
    [property: JsonPropertyName("confidence")] double Confidence,
    [property: JsonPropertyName("reasoning")] string Reasoning,
    [property: JsonPropertyName("relevant_sections")] IReadOnlyList<string> RelevantSections,
    [property: JsonPropertyName("missing_elements")] IReadOnlyList<string> MissingElements,
    [property: JsonPropertyName("improvement_suggestion")] string? ImprovementSuggestion,
    [property: JsonPropertyName("recommended_text")] string? RecommendedText
);

public sealed record DocumentAnalysisRequest(
    string DocumentText,
    string? DocumentName,
    string[]? FocusAreas,
    string[]? EvidenceTags
);

public sealed record DocumentAnalysisResponse(
    string DocumentName,
    string Summary,
    string RiskLevel,
    IReadOnlyList<string> Keywords,
    IReadOnlyDictionary<string, double> CoverageByFocusArea,
    IReadOnlyList<string> RecommendedActions,
    IReadOnlyList<string> KeyFindings
);

public sealed record GapAnalysisResponse(
    string Framework,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<GapInsight> Gaps
);

public sealed record GapAnalysisCombinedResponse(
    string Framework,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<GapInsight> Gaps,
    GapAnalysisAiResponse AiSummary
);

public sealed record GapInsight(
    string RequirementId,
    string Category,
    string Description,
    string Impact,
    string SuggestedAction,
    string[] EvidenceHints
);
