using System.Linq;
using EvidenceAnalyzer.Clients;
using EvidenceAnalyzer.Models;
using EvidenceAnalyzer.Options;
using EvidenceAnalyzer.Services;
using Microsoft.Extensions.Options;

const string ClientCorsPolicy = "ClientApp";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.Configure<OpenAIOptions>(builder.Configuration.GetSection(OpenAIOptions.SectionName));
builder.Services.Configure<ChecklistServiceOptions>(builder.Configuration.GetSection(ChecklistServiceOptions.SectionName));
builder.Services.AddHttpClient<IAIService, AIService>();
builder.Services.AddHttpClient<IChecklistClient, ChecklistClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<ChecklistServiceOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/'));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Removed HTTPS redirection to prevent 307 redirects when only HTTP is configured.
app.UseCors(ClientCorsPolicy);

app.MapGet("/", () =>
    Results.Json(new
    {
        service = "Evidence Analyzer Service",
        version = "v2",
        message = "Use /analyze/document, /analyze/match, or /analyze/gaps for compliance insights.",
        endpoints = new[] { "/analyze/document", "/analyze/match", "/analyze/gaps", "/swagger" }
    }))
    .WithName("GetServiceHome")
    .WithOpenApi(options =>
    {
        options.Summary = "Displays service metadata";
        options.Description = "Simple landing endpoint to confirm the API is running.";
        return options;
    });

app.MapPost("/analyze/document", (DocumentAnalysisRequest request) =>
    {
        if (string.IsNullOrWhiteSpace(request.DocumentText))
        {
            return Results.BadRequest(new { error = "DocumentText is required." });
        }

        var analysis = DocumentInsightsEngine.Analyze(request);
        return Results.Json(analysis);
    })
    .WithName("AnalyzeDocument")
    .WithOpenApi(options =>
    {
        options.Summary = "Summarize a document and highlight coverage gaps.";
        options.Description = "Performs lightweight NLP to extract keywords, risk levels, and recommended actions.";
        return options;
    });

app.MapPost("/analyze/match", async (AnalyzeMatchRequest request, IAIService aiService, ILoggerFactory loggerFactory, CancellationToken cancellationToken) =>
    {
        if (string.IsNullOrWhiteSpace(request.DocumentText) || string.IsNullOrWhiteSpace(request.Requirement))
        {
            return Results.BadRequest(new { error = "Both requirement and documentText fields are required." });
        }

        try
        {
            var assessment = await aiService.AnalyzeMatchAsync(request, cancellationToken);
            var response = new AnalyzeMatchResponse(
                assessment.Matches,
                assessment.Confidence,
                assessment.Reasoning,
                assessment.RelevantSections,
                assessment.MissingElements,
                assessment.ImprovementSuggestion,
                assessment.RecommendedText);
            return Results.Json(response);
        }
        catch (InvalidOperationException ex)
        {
            loggerFactory.CreateLogger("AnalyzeMatch").LogError(ex, "AI evidence analysis failed");
            return Results.Problem(ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    })
    .WithName("AnalyzeEvidenceMatch")
    .WithOpenApi(options =>
    {
        options.Summary = "Analyze whether a document satisfies a compliance requirement.";
        options.Description = "Uses an LLM-powered analyzer with deterministic fallback to compare document text with a requirement.";
        return options;
    });

app.MapGet("/analyze/gaps", (string? framework, string? focus) =>
    {
        var gaps = GapAnalyzer.Analyze(framework, focus);
        return Results.Json(gaps);
    })
    .WithName("AnalyzeGaps")
    .WithOpenApi(options =>
    {
        options.Summary = "List unmet controls for a framework.";
        options.Description = "Returns curated gap recommendations for ISO 27001 or SOC 2 with optional focus filtering.";
        return options;
    });

app.MapGet("/report/compliance/{checklistId:long}", async (long checklistId, IChecklistClient checklistClient, CancellationToken cancellationToken) =>
    {
        var checklist = await checklistClient.GetChecklistAsync(checklistId, cancellationToken);
        if (checklist is null)
        {
            return Results.NotFound(new { error = "Checklist not found" });
        }

        var progress = await checklistClient.GetProgressAsync(checklistId, cancellationToken);
        var total = checklist.Items.Count;
        var passed = checklist.Items.Count(item => string.Equals(item.Status, "passed", StringComparison.OrdinalIgnoreCase));
        var failed = checklist.Items.Count(item => string.Equals(item.Status, "failed", StringComparison.OrdinalIgnoreCase));
        var pending = total - passed - failed;

        var categories = checklist.Items
            .GroupBy(item => string.IsNullOrWhiteSpace(item.Category) ? "Uncategorized" : item.Category)
            .Select(group => new CategorySummary(
                group.Key,
                group.Count(),
                group.Count(i => string.Equals(i.Status, "passed", StringComparison.OrdinalIgnoreCase)),
                group.Count(i => string.Equals(i.Status, "pending", StringComparison.OrdinalIgnoreCase)),
                group.Count(i => string.Equals(i.Status, "failed", StringComparison.OrdinalIgnoreCase))
            ))
            .ToList();

        var completion = progress?.CompletionPercentage ?? (total == 0 ? 0 : passed * 100.0 / total);
        var nextActions = new List<string>
        {
            pending > 0 ? "Attach recent evidence (policy IDs, screenshots) to pending controls." : "Maintain evidence freshness with quarterly reviews.",
            failed > 0 ? "Hold remediation stand-ups for failed controls within 7 days." : "Celebrate passing status and schedule spot checks."
        };

        var response = new ComplianceReportResponse(
            checklist.Id,
            checklist.Name,
            total,
            passed,
            pending,
            failed,
            Math.Round(completion, 2),
            categories,
            nextActions
        );

        return Results.Json(response);
    })
    .WithName("GetComplianceReport")
    .WithOpenApi(options =>
    {
        options.Summary = "Compliance summary for a checklist";
        options.Description = "Aggregates checklist stats, category breakdowns, and suggested next actions.";
        return options;
    });

app.MapGet("/report/gaps/{checklistId:long}", async (long checklistId, IChecklistClient checklistClient, IAIService aiService, CancellationToken cancellationToken) =>
    {
        var checklist = await checklistClient.GetChecklistAsync(checklistId, cancellationToken);
        if (checklist is null)
        {
            return Results.NotFound(new { error = "Checklist not found" });
        }

        var gaps = checklist.Items
            .Where(item => !string.Equals(item.Status, "passed", StringComparison.OrdinalIgnoreCase))
            .Select(item => new GapItem(item.Id, item.Category, item.Requirement, item.Status, item.Hints, item.Evidence))
            .ToList();

        var aiRequest = new GapAnalysisAiRequest(
            gaps.Select(g => g.Requirement).ToArray(),
            gaps.SelectMany(g => g.Evidence).ToArray()
        );

        var aiSummary = await aiService.AnalyzeGapsAsync(aiRequest, cancellationToken);

        var response = new GapReportResponse(checklist.Id, checklist.Name, gaps, aiSummary);
        return Results.Json(response);
    })
    .WithName("GetGapReport")
    .WithOpenApi(options =>
    {
        options.Summary = "Gap analysis for a checklist";
        options.Description = "Returns outstanding items plus AI-prioritized recommendations.";
        return options;
    });

app.MapPost("/report/suggestions", async (ReportSuggestionRequest request, IChecklistClient checklistClient, IAIService aiService, CancellationToken cancellationToken) =>
    {
        var checklist = await checklistClient.GetChecklistAsync(request.ChecklistId, cancellationToken);
        if (checklist is null)
        {
            return Results.NotFound(new { error = "Checklist not found" });
        }

        var progress = await checklistClient.GetProgressAsync(request.ChecklistId, cancellationToken);
        var suggestions = await aiService.GenerateSuggestionsAsync(request, checklist, progress, cancellationToken);
        return Results.Json(suggestions);
    })
    .WithName("PostReportSuggestions")
    .WithOpenApi(options =>
    {
        options.Summary = "AI-generated improvement suggestions";
        options.Description = "Returns quick wins, remediation plan, templates, and best practices based on checklist progress.";
        return options;
    });

app.Run();
