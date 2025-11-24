namespace EvidenceAnalyzer.Options;

public sealed class ChecklistServiceOptions
{
    public const string SectionName = "ChecklistService";

    /// <summary>
    /// Base URL for the Java checklist-service (e.g., http://localhost:8080/).
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:8080/";

    /// <summary>
    /// API path for retrieving checklists (default /api/checklists).
    /// </summary>
    public string ChecklistsPath { get; set; } = "/api/checklists";

    public string ProgressPathTemplate { get; set; } = "/api/checklists/{0}/progress";
}
