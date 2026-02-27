using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.Infrastructure.Services;

public class BlobStorageService : IFileStorageService
{
    private readonly BlobContainerClient _containerClient;
    private readonly ILogger<BlobStorageService> _logger;

    public BlobStorageService(IConfiguration configuration, ILogger<BlobStorageService> logger)
    {
        _logger = logger;
        var connectionString = configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("BlobStorage:ConnectionString is not configured.");
        var containerName = configuration["BlobStorage:ContainerName"] ?? "3d-models";

        var serviceClient = new BlobServiceClient(connectionString);
        _containerClient = serviceClient.GetBlobContainerClient(containerName);
        _containerClient.CreateIfNotExists(PublicAccessType.None);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string blobName, string contentType)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(fileStream, new BlobHttpHeaders
        {
            ContentType = contentType
        });

        _logger.LogInformation("Uploaded blob: {BlobName}", blobName);
        return blobClient.Uri.ToString();
    }

    public async Task DeleteFileAsync(string blobName)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync();
        _logger.LogInformation("Deleted blob: {BlobName}", blobName);
    }

    public async Task<Stream> DownloadFileAsync(string blobName)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);
        var response = await blobClient.DownloadStreamingAsync();
        return response.Value.Content;
    }

    public async Task<bool> ExistsAsync(string blobName)
    {
        var blobClient = _containerClient.GetBlobClient(blobName);
        var response = await blobClient.ExistsAsync();
        return response.Value;
    }
}