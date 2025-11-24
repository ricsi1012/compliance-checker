using System.Text.Json.Serialization;

namespace EvidenceAnalyzer.Models;

public sealed record ComplianceReportResponse(
    long ChecklistId,
    string ChecklistName,
    int TotalItems,
    int PassedItems,
    int PendingItems,
    int FailedItems,
    double CompletionPercentage,
    IReadOnlyList<CategorySummary> Categories,
    IReadOnlyList<string> NextActions
);

public sealed record CategorySummary(
    string Name,
    int Total,
    int Passed,
    int Pending,
    int Failed
);

public sealed record GapReportResponse(
    long ChecklistId,
    string ChecklistName,
    IReadOnlyList<GapItem> Gaps,
    GapAnalysisAiResponse AiSummary
);

public sealed record GapItem(
    long ItemId,
    string Category,
    string Requirement,
    string Status,
    IReadOnlyList<string> Hints,
    IReadOnlyList<string> Evidence
);

public sealed record GapAnalysisAiRequest(
    IReadOnlyList<string> Requirements,
    IReadOnlyList<string> Evidence
);

public sealed record GapAnalysisAiResponse
{
    [JsonPropertyName("uncovered_requirements")]
    public IReadOnlyList<string> UncoveredRequirements { get; init; } = Array.Empty<string>();

    [JsonPropertyName("partial_coverage")]
    public IReadOnlyList<string> PartialCoverage { get; init; } = Array.Empty<string>();

    [JsonPropertyName("priority_gaps")]
    public IReadOnlyList<PriorityGap> PriorityGaps { get; init; } = Array.Empty<PriorityGap>();

    [JsonPropertyName("next_steps")]
    public IReadOnlyList<string> NextSteps { get; init; } = Array.Empty<string>();
}

public sealed record PriorityGap(
    string Requirement,
    string Severity,
    string Recommendation
);

public sealed record ReportSuggestionRequest(
    long ChecklistId,
    string? Audience,
    string[]? FocusAreas,
    string[]? EvidenceHighlights,
    string? Tone
);

public sealed record ReportSuggestionResponse(
    string ExecutiveSummary,
    IReadOnlyList<string> QuickWins,
    IReadOnlyList<string> RemediationPlan,
    IReadOnlyList<string> TemplateRecommendations,
    IReadOnlyList<string> BestPractices
);
