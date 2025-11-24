using System;
using System.Collections.Generic;
using System.Linq;
using EvidenceAnalyzer.Models;

namespace EvidenceAnalyzer.Services;

internal static class GapAnalyzer
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<GapInsight>> GapCatalog =
        new Dictionary<string, IReadOnlyList<GapInsight>>(StringComparer.OrdinalIgnoreCase)
        {
            ["ISO-27001"] = new List<GapInsight>
            {
                new("A.5.1", "Policies", "Information security policy is not formally approved or reviewed annually.", "High", "Publish the current ISMS policy with executive approval and circulate to stakeholders.", new[] { "Policy approval memo", "Annual review tracker" }),
                new("A.6.2", "Access Control", "Privileged access reviews are ad-hoc with no evidence trail.", "Medium", "Implement quarterly privileged access recertification with sign-off.", new[] { "Access review log", "ServiceNow ticket" }),
                new("A.12.3", "Backup", "Backup encryption settings vary across environments.", "High", "Standardize encryption-in-transit and at-rest policies for all backup targets.", new[] { "Backup config export", "Encryption screenshots" })
            },
            ["SOC2"] = new List<GapInsight>
            {
                new("CC1.3", "Governance", "Risk register lacks owners for high impact items.", "Medium", "Assign accountable owners and due dates for each risk and track mitigation.", new[] { "Risk register", "Owner assignment" }),
                new("CC6.7", "Change Management", "No documented rollback plans for emergency changes.", "High", "Add rollback sections to emergency change templates and capture test evidence.", new[] { "Change record", "Rollback test" })
            }
        };

    public static GapAnalysisResponse Analyze(string? framework, string? focus)
    {
        var selectedFramework = string.IsNullOrWhiteSpace(framework) ? "ISO-27001" : framework.Trim();
        var catalog = GapCatalog.TryGetValue(selectedFramework, out var items)
            ? items
            : GapCatalog["ISO-27001"];

        var filtered = string.IsNullOrWhiteSpace(focus)
            ? catalog
            : catalog.Where(item => item.Category.Contains(focus!, StringComparison.OrdinalIgnoreCase) ||
                                    item.RequirementId.Contains(focus!, StringComparison.OrdinalIgnoreCase))
                     .ToList();

        return new GapAnalysisResponse(
            selectedFramework.ToUpperInvariant(),
            DateTimeOffset.UtcNow,
            filtered.Count == 0 ? catalog : filtered
        );
    }
}
