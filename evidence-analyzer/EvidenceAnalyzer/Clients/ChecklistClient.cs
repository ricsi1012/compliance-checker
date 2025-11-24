using System.Net.Http.Json;
using EvidenceAnalyzer.Models;
using EvidenceAnalyzer.Options;
using Microsoft.Extensions.Options;

namespace EvidenceAnalyzer.Clients;

public interface IChecklistClient
{
    Task<ChecklistSnapshot?> GetChecklistAsync(long checklistId, CancellationToken cancellationToken = default);
    Task<ChecklistProgress?> GetProgressAsync(long checklistId, CancellationToken cancellationToken = default);
}

public sealed class ChecklistClient : IChecklistClient
{
    private readonly HttpClient _httpClient;
    private readonly ChecklistServiceOptions _options;

    public ChecklistClient(HttpClient httpClient, IOptions<ChecklistServiceOptions> options)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
    }

    public async Task<ChecklistSnapshot?> GetChecklistAsync(long checklistId, CancellationToken cancellationToken = default)
    {
        var endpoint = BuildUri($"{_options.ChecklistsPath}/{checklistId}");
        return await _httpClient.GetFromJsonAsync<ChecklistSnapshot>(endpoint, cancellationToken);
    }

    public async Task<ChecklistProgress?> GetProgressAsync(long checklistId, CancellationToken cancellationToken = default)
    {
        var path = string.Format(_options.ProgressPathTemplate, checklistId);
        var endpoint = BuildUri(path);
        return await _httpClient.GetFromJsonAsync<ChecklistProgress>(endpoint, cancellationToken);
    }

    private Uri BuildUri(string path)
    {
        var baseText = _options.BaseUrl.EndsWith('/') ? _options.BaseUrl : _options.BaseUrl + "/";
        if (!Uri.TryCreate(baseText, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException($"Invalid checklist service base URL: {_options.BaseUrl}");
        }

        var relativePath = path.TrimStart('/');
        return new Uri(baseUri, relativePath);
    }
}
