using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using EvidenceAnalyzer.Models;
using Microsoft.Extensions.Options;

namespace EvidenceAnalyzer.Services;

public interface IAIService
{
    Task<MatchAssessment> AnalyzeMatchAsync(AnalyzeMatchRequest request, CancellationToken cancellationToken = default);
    Task<GapAnalysisAiResponse> AnalyzeGapsAsync(GapAnalysisAiRequest request, CancellationToken cancellationToken = default);
    Task<ReportSuggestionResponse> GenerateSuggestionsAsync(ReportSuggestionRequest request, ChecklistSnapshot checklist, ChecklistProgress? progress, CancellationToken cancellationToken = default);
}

public sealed class AIService : IAIService
{
    private static readonly Regex KeywordMatcher = new(@"[A-Za-z]{4,}", RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly OpenAIOptions _options;
    private readonly ILogger<AIService> _logger;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private bool HasApiKey => !string.IsNullOrWhiteSpace(_options.ApiKey);

    public AIService(HttpClient httpClient, IOptions<OpenAIOptions> options, ILogger<AIService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public async Task<MatchAssessment> AnalyzeMatchAsync(AnalyzeMatchRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Requirement) || string.IsNullOrWhiteSpace(request.DocumentText))
        {
            throw new ArgumentException("Both requirement and document text must be provided for AI analysis.");
        }

        if (!HasApiKey)
        {
            throw new InvalidOperationException("OpenAI API key missing; cannot perform AI analysis.");
        }

        try
        {
            var userPrompt = PromptFactory.BuildUserPrompt(request);
            var content = await InvokeChatCompletionAsync(PromptFactory.MatchSystemPrompt, userPrompt, cancellationToken);
            var sanitizedContent = ExtractJsonPayload(content);
            var assessment = JsonSerializer.Deserialize<MatchAssessment>(sanitizedContent, _jsonOptions)
                             ?? throw new InvalidOperationException("OpenAI response did not match the expected schema.");
            return NormalizeMatchAssessment(assessment, request);
        }
        catch (Exception ex) when (ex is InvalidOperationException or JsonException or HttpRequestException)
        {
            _logger.LogError(ex, "LLM evidence analysis failed.");
            throw new InvalidOperationException("AI evidence analysis failed.", ex);
        }
    }

    public async Task<GapAnalysisAiResponse> AnalyzeGapsAsync(GapAnalysisAiRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!HasApiKey)
        {
            _logger.LogWarning("OpenAI API key missing; using heuristic gap analyzer.");
            return BuildGapHeuristicResponse(request);
        }

        try
        {
            var userPrompt = PromptFactory.BuildGapAnalysisPrompt(request);
            var content = await InvokeChatCompletionAsync(PromptFactory.GapSystemPrompt, userPrompt, cancellationToken);
            var sanitizedContent = ExtractJsonPayload(content);
            var response = JsonSerializer.Deserialize<GapAnalysisAiResponse>(sanitizedContent, _jsonOptions)
                            ?? throw new InvalidOperationException("Gap analysis response was empty.");
            return NormalizeGapResponse(response);
        }
        catch (Exception ex) when (ex is InvalidOperationException or JsonException or HttpRequestException)
        {
            _logger.LogWarning(ex, "Falling back to heuristic gap analysis due to LLM issue.");
            return BuildGapHeuristicResponse(request);
        }
    }

    public async Task<ReportSuggestionResponse> GenerateSuggestionsAsync(ReportSuggestionRequest request, ChecklistSnapshot checklist, ChecklistProgress? progress, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(checklist);

        if (!HasApiKey)
        {
            _logger.LogWarning("OpenAI API key missing; using heuristic suggestions.");
            return BuildSuggestionFallback(request, checklist, progress);
        }

        try
        {
            var userPrompt = PromptFactory.BuildSuggestionPrompt(request, checklist, progress);
            var content = await InvokeChatCompletionAsync(PromptFactory.SuggestionSystemPrompt, userPrompt, cancellationToken);
            var sanitizedContent = ExtractJsonPayload(content);
            var response = JsonSerializer.Deserialize<ReportSuggestionResponse>(sanitizedContent, _jsonOptions)
                            ?? throw new InvalidOperationException("Suggestion response was empty.");
            return NormalizeSuggestionResponse(response);
        }
        catch (Exception ex) when (ex is InvalidOperationException or JsonException or HttpRequestException)
        {
            _logger.LogWarning(ex, "Falling back to heuristic suggestions due to LLM issue.");
            return BuildSuggestionFallback(request, checklist, progress);
        }
    }

    private async Task<string> InvokeChatCompletionAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken)
    {
        var requestBody = new ChatCompletionRequest
        {
            Model = string.IsNullOrWhiteSpace(_options.Model) ? "gpt-4o-mini" : _options.Model!,
            Messages =
            [
                new ChatMessageRequest("system", systemPrompt),
                new ChatMessageRequest("user", userPrompt)
            ],
            Temperature = 0.2
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, _options.Endpoint ?? OpenAIOptions.DefaultEndpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody, _jsonOptions), Encoding.UTF8, "application/json")
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"OpenAI chat completion failed: {response.StatusCode} {responseContent}");
        }

        var completion = JsonSerializer.Deserialize<ChatCompletionResponse>(responseContent, _jsonOptions)
                         ?? throw new InvalidOperationException("Unable to deserialize OpenAI response.");
        var content = completion.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("OpenAI response did not contain any content.");
        }

        return content;
    }

    private static string ExtractJsonPayload(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return content ?? string.Empty;
        }

        var trimmed = content.Trim();

        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = trimmed.IndexOf('\n');
            if (firstNewLine >= 0)
            {
                trimmed = trimmed[(firstNewLine + 1)..];
            }
            trimmed = trimmed.TrimStart('\r', '\n').Trim();
            if (trimmed.EndsWith("```", StringComparison.Ordinal))
            {
                trimmed = trimmed[..^3];
            }
        }

        return trimmed.Trim();
    }

    private static MatchAssessment NormalizeMatchAssessment(MatchAssessment assessment, AnalyzeMatchRequest request)
    {
        var normalizedSections = assessment.RelevantSections ?? Array.Empty<string>();
        if (normalizedSections.Count == 0)
        {
            var tokens = ExtractRequirementTokens(request.Requirement ?? string.Empty);
            normalizedSections = DocumentInsightsEngine.ExtractRelevantSections(request.DocumentText ?? string.Empty, tokens);
        }

        var missingElements = assessment.MissingElements ?? Array.Empty<string>();
        if (!assessment.Matches && missingElements.Count == 0)
        {
            missingElements = new[] { "Add concrete evidence such as policy IDs, screenshots, or logged approvals." };
        }

        var improvementSuggestion = assessment.Matches
            ? null
            : string.IsNullOrWhiteSpace(assessment.ImprovementSuggestion)
                ? BuildDefaultImprovementSuggestion()
                : assessment.ImprovementSuggestion!.Trim();

        var recommendedText = assessment.Matches
            ? null
            : string.IsNullOrWhiteSpace(assessment.RecommendedText)
                ? BuildDefaultRecommendedText(request)
                : assessment.RecommendedText!.Trim();

        return assessment with
        {
            RelevantSections = normalizedSections,
            MissingElements = missingElements,
            ImprovementSuggestion = improvementSuggestion,
            RecommendedText = recommendedText
        };
    }

    private static string BuildDefaultImprovementSuggestion()
    {
        return "Document the control owner, process steps, and attach dated evidence (policy IDs, logs, approvals).";
    }

    private static string BuildDefaultRecommendedText(AnalyzeMatchRequest request)
    {
        var sanitizedRequirement = string.IsNullOrWhiteSpace(request.Requirement)
            ? "the stated control"
            : request.Requirement.Trim();

        return $"""Control Statement: {sanitizedRequirement}\nImplementation Evidence: Describe the system/process, owner, and last review date.\nArtifacts: Link to policy/procedure, screenshot, or ticket proving execution.""";
    }

    private static GapAnalysisAiResponse BuildGapHeuristicResponse(GapAnalysisAiRequest request)
    {
        var requirements = request.Requirements ?? Array.Empty<string>();
        var evidence = request.Evidence ?? Array.Empty<string>();
        var requirementTokens = requirements
            .Select(req => new { Requirement = req, Tokens = ExtractRequirementTokens(req) })
            .ToArray();

        var uncovered = requirementTokens
            .Where(entry => entry.Tokens.Length == 0 || entry.Tokens.All(token => evidence.All(e => !e.Contains(token, StringComparison.OrdinalIgnoreCase))))
            .Select(entry => entry.Requirement)
            .Take(5)
            .ToArray();

        var partial = requirementTokens
            .Where(entry => !uncovered.Contains(entry.Requirement) && entry.Tokens.Any(token => evidence.Any(e => e.Contains(token, StringComparison.OrdinalIgnoreCase))))
            .Select(entry => entry.Requirement)
            .Take(5)
            .ToArray();

        var priority = uncovered
            .Select(req => new PriorityGap(req, "critical", "Document specific control owners, procedures, and evidence."))
            .Take(3)
            .ToArray();

        return new GapAnalysisAiResponse
        {
            UncoveredRequirements = uncovered,
            PartialCoverage = partial,
            PriorityGaps = priority,
            NextSteps = new[]
            {
                "Collect evidence (policy link, log export, approval) for each uncovered control.",
                "Assign owners and due dates for remediation.",
                "Store artifacts in a centralized evidence folder."
            }
        };
    }

    private static ReportSuggestionResponse BuildSuggestionFallback(ReportSuggestionRequest request, ChecklistSnapshot checklist, ChecklistProgress? progress)
    {
        var total = checklist.Items.Count;
        var completed = checklist.Items.Count(i => string.Equals(i.Status, "passed", StringComparison.OrdinalIgnoreCase));
        var pending = total - completed;
        var completion = progress?.CompletionPercentage ?? (total == 0 ? 0 : completed * 100.0 / total);

        var executiveSummary = $"{checklist.Name} is {completion:F1}% complete with {pending} controls needing evidence.";

        return new ReportSuggestionResponse(
            executiveSummary,
            new[]
            {
                "Close easy wins by attaching current policies and screenshots to pending controls.",
                "Log decisions inside the evidence register to avoid rework."
            },
            new[]
            {
                "Assign control owners for each open item and track due dates in a Kanban board.",
                "Schedule a brown-bag session to walk stakeholders through evidence expectations."
            },
            new[]
            {
                "Password Policy Template (ISO-aligned)",
                "Incident Postmortem Template" 
            },
            new[]
            {
                "Review controls quarterly and update evidence immediately after changes.",
                "Store artifacts in versioned folders with clear owners."
            }
        );
    }

    private static GapAnalysisAiResponse NormalizeGapResponse(GapAnalysisAiResponse response)
    {
        return new GapAnalysisAiResponse
        {
            UncoveredRequirements = response.UncoveredRequirements ?? Array.Empty<string>(),
            PartialCoverage = response.PartialCoverage ?? Array.Empty<string>(),
            PriorityGaps = response.PriorityGaps ?? Array.Empty<PriorityGap>(),
            NextSteps = response.NextSteps ?? Array.Empty<string>()
        };
    }

    private static ReportSuggestionResponse NormalizeSuggestionResponse(ReportSuggestionResponse response)
    {
        return new ReportSuggestionResponse(
            response.ExecutiveSummary,
            response.QuickWins ?? Array.Empty<string>(),
            response.RemediationPlan ?? Array.Empty<string>(),
            response.TemplateRecommendations ?? Array.Empty<string>(),
            response.BestPractices ?? Array.Empty<string>()
        );
    }

    private static string[] ExtractRequirementTokens(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return Array.Empty<string>();
        }

        return KeywordMatcher.Matches(text)
            .Select(match => match.Value.ToLowerInvariant())
            .Distinct()
            .ToArray();
    }
}

public sealed class OpenAIOptions
{
    public const string SectionName = "OpenAI";
    public const string DefaultEndpoint = "https://api.openai.com/v1/chat/completions";

    public string ApiKey { get; set; } = "INSERT_YOUR_API_KEY_HERE";
    public string? Endpoint { get; set; } = DefaultEndpoint;
    public string Model { get; set; } = "gpt-4o";
}

public sealed record MatchAssessment
{
    [JsonPropertyName("matches")]
    public bool Matches { get; init; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; init; }

    [JsonPropertyName("reasoning")]
    public string Reasoning { get; init; } = string.Empty;

    [JsonPropertyName("relevant_sections")]
    public IReadOnlyList<string> RelevantSections { get; init; } = Array.Empty<string>();

    [JsonPropertyName("missing_elements")]
    public IReadOnlyList<string> MissingElements { get; init; } = Array.Empty<string>();

    [JsonPropertyName("improvement_suggestion")]
    public string? ImprovementSuggestion { get; init; }

    [JsonPropertyName("recommended_text")]
    public string? RecommendedText { get; init; }
}

file sealed class ChatCompletionRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<ChatMessageRequest> Messages { get; set; } = new();

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; }
}

file sealed class ChatMessageRequest
{
    public ChatMessageRequest(string role, string content)
    {
        Role = role;
        Content = content;
    }

    [JsonPropertyName("role")]
    public string Role { get; }

    [JsonPropertyName("content")]
    public string Content { get; }
}

file sealed class ChatCompletionResponse
{
    [JsonPropertyName("choices")]
    public List<Choice> Choices { get; set; } = new();
}

file sealed class Choice
{
    [JsonPropertyName("message")]
    public ChatMessage? Message { get; set; }
}

file sealed class ChatMessage
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
