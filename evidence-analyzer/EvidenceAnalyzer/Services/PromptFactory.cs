using System.Linq;
using EvidenceAnalyzer.Models;

namespace EvidenceAnalyzer.Services;

internal static class PromptFactory
{
        public const string MatchSystemPrompt = """
You are an expert compliance auditor. Given a regulatory requirement, document text, and optional hints, determine if the document satisfies the requirement.
- Respond ONLY in strict JSON following this schema:
    {
        "matches": boolean,
        "confidence": number between 0 and 1,
        "relevant_sections": string[],
        "reasoning": string,
        "missing_elements": string[],
        "improvement_suggestion": string | null,
        "recommended_text": string | null
    }
- Cite concrete evidence from the document in reasoning and populate at least one relevant section when possible.
- If evidence is missing, set matches to false, explain why, list the missing elements, and provide BOTH improvement_suggestion (short advice) and recommended_text (copy-ready snippet the user can add to their document).
- Base every statement on the provided document; do not invent facts.
""";

        public const string GapSystemPrompt = """
You are an ISO 27001 compliance expert. Compare the list of required controls with provided evidence snippets.
Return JSON with this schema:
{
    "uncovered_requirements": string[],
    "partial_coverage": string[],
    "priority_gaps": [
        {"requirement": string, "severity": "critical" | "high" | "medium", "recommendation": string}
    ],
    "next_steps": string[]
}
Focus on clarity and keep arrays short (max 5 items each).
""";

        public const string SuggestionSystemPrompt = """
You are an AI compliance coach. Based on checklist progress, focus areas, and highlighted evidence, craft actionable improvement suggestions.
Return JSON with this schema:
{
    "executive_summary": string,
    "quick_wins": string[],
    "remediation_plan": string[],
    "template_recommendations": string[],
    "best_practices": string[]
}
Use concise bullet-style statements.
""";

    public static string BuildUserPrompt(AnalyzeMatchRequest request)
    {
        var sanitizedHints = (request.Hints ?? Array.Empty<string>())
            .Select(h => h?.Trim())
            .Where(h => !string.IsNullOrWhiteSpace(h))
            .ToArray();

        var hintsSection = sanitizedHints.Length > 0
            ? "- " + string.Join("\n- ", sanitizedHints)
            : "(no hints provided)";

        return $"""
Requirement under review:
{request.Requirement}

Document excerpt to analyze:
{request.DocumentText}

Optional hints from reviewer:
{hintsSection}

Task: Explain whether the document satisfies the requirement, reference specific evidence, list missing elements if not fully compliant, and respond using the JSON schema provided by the system instructions.
""";
    }

    public static string BuildGapAnalysisPrompt(GapAnalysisAiRequest request)
    {
        return $"""
REQUIREMENTS:
{System.Text.Json.JsonSerializer.Serialize(request.Requirements)}

EVIDENCE PROVIDED:
{System.Text.Json.JsonSerializer.Serialize(request.Evidence)}

Compare the two lists, identify uncovered controls, partial coverage, priority gaps (critical vs nice-to-have), and next steps.
""";
    }

    public static string BuildSuggestionPrompt(ReportSuggestionRequest request, ChecklistSnapshot snapshot, ChecklistProgress? progress)
    {
        var focus = request.FocusAreas?.Length > 0
            ? string.Join(", ", request.FocusAreas)
            : "general ISO 27001 maturity";

        var highlights = request.EvidenceHighlights?.Length > 0
            ? string.Join(", ", request.EvidenceHighlights)
            : "no notable evidence provided";

        var completion = progress?.CompletionPercentage ?? 0;
        return $"""
CHECKLIST NAME: {snapshot.Name}
TOTAL ITEMS: {snapshot.Items.Count}
PROGRESS: {completion:F1}% complete
FOCUS AREAS: {focus}
EVIDENCE HIGHLIGHTS: {highlights}
AUDIENCE TONE: {request.Audience ?? request.Tone ?? "executive summary"}

Craft compliance improvement suggestions referencing the schema defined in the system prompt.
""";
    }
}
