namespace PrintHub.Core.Interfaces.Services;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string blobName, string contentType);
    Task DeleteFileAsync(string blobName);
    Task<Stream> DownloadFileAsync(string blobName);
    Task<bool> ExistsAsync(string blobName);

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