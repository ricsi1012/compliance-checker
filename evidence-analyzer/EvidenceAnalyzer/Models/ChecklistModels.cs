using System.Text.Json.Serialization;

namespace EvidenceAnalyzer.Models;

public sealed record ChecklistSnapshot
{
    [JsonPropertyName("id")] public long Id { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("items")] public IReadOnlyList<ChecklistItemSnapshot> Items { get; init; } = Array.Empty<ChecklistItemSnapshot>();
}

public sealed record ChecklistItemSnapshot
{
    [JsonPropertyName("id")] public long Id { get; init; }
    [JsonPropertyName("category")] public string Category { get; init; } = string.Empty;
    [JsonPropertyName("requirement")] public string Requirement { get; init; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; init; } = string.Empty;
    [JsonPropertyName("hints")] public IReadOnlyList<string> Hints { get; init; } = Array.Empty<string>();
    [JsonPropertyName("evidence")] public IReadOnlyList<string> Evidence { get; init; } = Array.Empty<string>();
}

public sealed record ChecklistProgress
{
    [JsonPropertyName("checklistId")] public long ChecklistId { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("totalItems")] public int TotalItems { get; init; }
    [JsonPropertyName("passedItems")] public int PassedItems { get; init; }
    [JsonPropertyName("completionPercentage")] public double CompletionPercentage { get; init; }
}
