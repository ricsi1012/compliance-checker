using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using EvidenceAnalyzer.Models;

namespace EvidenceAnalyzer.Services;

internal static class DocumentInsightsEngine
{
    private static readonly Regex SentenceSplitter = new(@"(?<=[.!?])\s+", RegexOptions.Compiled);
    private static readonly Regex WordMatcher = new(@"[A-Za-z]{4,}", RegexOptions.Compiled);

    public static DocumentAnalysisResponse Analyze(DocumentAnalysisRequest request)
    {
        var normalizedDocument = (request.DocumentText ?? string.Empty).Trim();
        var summary = BuildSummary(normalizedDocument);
        var keywords = ExtractKeywords(normalizedDocument);
        var coverage = BuildCoverageScores(request.FocusAreas, normalizedDocument);
        var riskLevel = DetermineRiskLevel(normalizedDocument, coverage);
        var findings = BuildKeyFindings(normalizedDocument, coverage);
        var recommendations = BuildRecommendations(riskLevel, coverage, request.FocusAreas);

        var documentName = string.IsNullOrWhiteSpace(request.DocumentName)
            ? "Uploaded Document"
            : request.DocumentName.Trim();

        return new DocumentAnalysisResponse(
            documentName,
            summary,
            riskLevel,
            keywords,
            coverage,
            recommendations,
            findings
        );
    }

    public static IReadOnlyList<string> ExtractRelevantSections(string documentText, IEnumerable<string> tokens, int maxSections = 3)
    {
        if (string.IsNullOrWhiteSpace(documentText))
        {
            return Array.Empty<string>();
        }

        var lowered = documentText.ToLowerInvariant();
        var normalizedTokens = tokens
            .Select(t => t?.Trim().ToLowerInvariant())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToArray();

        if (normalizedTokens.Length == 0)
        {
            return Array.Empty<string>();
        }

        var sentences = SentenceSplitter.Split(documentText)
            .Select(sentence => sentence.Trim())
            .Where(sentence => sentence.Length > 0)
            .ToArray();

        var relevant = new List<string>();
        foreach (var sentence in sentences)
        {
            var lowerSentence = sentence.ToLowerInvariant();
            if (normalizedTokens.Any(token => !string.IsNullOrEmpty(token) && lowerSentence.Contains(token)))
            {
                relevant.Add(sentence);
            }

            if (relevant.Count >= maxSections)
            {
                break;
            }
        }

        return relevant;
    }

    private static string BuildSummary(string document)
    {
        if (string.IsNullOrWhiteSpace(document))
        {
            return "No content provided for analysis.";
        }

        var sentences = SentenceSplitter.Split(document)
            .Select(sentence => sentence.Trim())
            .Where(sentence => sentence.Length > 0)
            .Take(3)
            .ToArray();

        if (sentences.Length == 0)
        {
            return document.Length > 220
                ? document[..220] + "..."
                : document;
        }

        return string.Join(" ", sentences);
    }

    private static IReadOnlyList<string> ExtractKeywords(string document)
    {
        if (string.IsNullOrWhiteSpace(document))
        {
            return Array.Empty<string>();
        }

        var frequency = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in WordMatcher.Matches(document))
        {
            var token = match.Value.ToLowerInvariant();
            frequency[token] = frequency.TryGetValue(token, out var count) ? count + 1 : 1;
        }

        return frequency
            .OrderByDescending(kvp => kvp.Value)
            .ThenBy(kvp => kvp.Key, StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .Select(kvp => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(kvp.Key))
            .ToArray();
    }

    private static IReadOnlyDictionary<string, double> BuildCoverageScores(string[]? focusAreas, string document)
    {
        var coverage = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        var normalizedDocument = document.ToLowerInvariant();

        if (focusAreas == null || focusAreas.Length == 0)
        {
            coverage["general"] = Math.Round(Math.Clamp(normalizedDocument.Length / 4000d, 0, 1), 2);
            return coverage;
        }

        foreach (var area in focusAreas)
        {
            if (string.IsNullOrWhiteSpace(area))
            {
                continue;
            }

            var tokens = WordMatcher.Matches(area)
                .Select(match => match.Value.ToLowerInvariant())
                .Distinct()
                .ToArray();

            if (tokens.Length == 0)
            {
                continue;
            }

            var hits = tokens.Count(token => normalizedDocument.Contains(token));
            var score = Math.Round(Math.Clamp((double)hits / tokens.Length, 0, 1), 2);
            coverage[area.Trim()] = score;
        }

        if (coverage.Count == 0)
        {
            coverage["general"] = Math.Round(Math.Clamp(normalizedDocument.Length / 4000d, 0, 1), 2);
        }

        return coverage;
    }

    private static string DetermineRiskLevel(string document, IReadOnlyDictionary<string, double> coverage)
    {
        if (string.IsNullOrWhiteSpace(document))
        {
            return "unknown";
        }

        var averageCoverage = coverage.Count == 0 ? 0 : coverage.Values.Average();
        if (averageCoverage >= 0.75)
        {
            return "low";
        }

        if (averageCoverage >= 0.45)
        {
            return "medium";
        }

        return "high";
    }

    private static IReadOnlyList<string> BuildKeyFindings(string document, IReadOnlyDictionary<string, double> coverage)
    {
        if (string.IsNullOrWhiteSpace(document))
        {
            return new[] { "Document was empty or unreadable." };
        }

        var findings = new List<string>();
        foreach (var (area, score) in coverage)
        {
            var descriptor = score switch
            {
                >= 0.8 => "Strong evidence of",
                >= 0.5 => "Partial coverage of",
                >= 0.3 => "Limited references to",
                _ => "Missing detail for"
            };

            findings.Add($"{descriptor} {area} controls (score {score:P0}).");
        }

        if (findings.Count == 0)
        {
            findings.Add("No focus areas provided. Consider specifying controls to evaluate.");
        }

        return findings;
    }

    private static IReadOnlyList<string> BuildRecommendations(string riskLevel, IReadOnlyDictionary<string, double> coverage, string[]? focusAreas)
    {
        var actions = new List<string>();

        switch (riskLevel)
        {
            case "low":
                actions.Add("Maintain current control coverage and document review cadence.");
                break;
            case "medium":
                actions.Add("Add concrete evidence (screenshots, policy IDs) for partially covered controls.");
                break;
            default:
                actions.Add("Provide explicit procedures, owners, and evidence for each missing control.");
                break;
        }

        if (focusAreas != null)
        {
            var uncovered = coverage
                .Where(entry => entry.Value < 0.5)
                .Select(entry => entry.Key)
                .Take(3)
                .ToArray();

            foreach (var area in uncovered)
            {
                actions.Add($"Strengthen documentation for {area} — coverage is below 50%.");
            }
        }

        return actions;
    }
}
