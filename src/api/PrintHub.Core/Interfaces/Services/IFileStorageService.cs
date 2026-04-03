namespace PrintHub.Core.Interfaces.Services;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string blobName, string contentType);
    Task DeleteFileAsync(string blobName);
    Task<Stream> DownloadFileAsync(string blobName);
    Task<bool> ExistsAsync(string blobName);

    /// <summary>
    /// Generate a time-limited read-only SAS URL for a blob identified by its name
    /// (i.e. the path within the container, e.g. "material-intake/2026/04/xxx.jpg").
    /// Use this when you already have the blob name stored separately.
    /// </summary>
    Task<string> GenerateSasUrlAsync(string blobName, TimeSpan ttl);

    /// <summary>
    /// Generate a time-limited read-only SAS URL from a full blob storage URL.
    /// Parses the blob name out of the URL automatically and handles both Azure
    /// and Azurite URL formats. Returns the original URL unchanged if it does not
    /// look like a blob storage URL (e.g. external CDN or user-entered URLs).
    /// Use this when you only have the full URL stored, not the blob name.
    /// </summary>
    Task<string> GenerateSasFromUrlAsync(string url, TimeSpan ttl);

    /// <summary>
    /// Stage a single block as part of a chunked upload.
    /// The block remains uncommitted until CommitBlocksAsync is called.
    /// </summary>
    Task StageBlockAsync(string blobName, string blockId, Stream blockData);

    /// <summary>
    /// Commit all staged blocks into a single blob and set the content type.
    /// </summary>
    Task<string> CommitBlocksAsync(string blobName, IReadOnlyList<string> blockIds, string contentType);
}