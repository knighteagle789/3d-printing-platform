namespace PrintHub.Core.Interfaces.Services;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string blobName, string contentType);
    Task DeleteFileAsync(string blobName);
    Task<Stream> DownloadFileAsync(string blobName);
    Task<bool> ExistsAsync(string blobName);
}