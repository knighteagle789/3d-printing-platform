using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.Infrastructure.Services;

public class BlobStorageService : IFileStorageService
{
    private readonly BlobContainerClient _containerClient;
    private readonly ILogger<BlobStorageService> _logger;
    private readonly bool _isDevelopment;

    public BlobStorageService(
        IConfiguration configuration, 
        ILogger<BlobStorageService> logger)
    {
        _logger = logger;
        _isDevelopment = configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
        var connectionString = configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("BlobStorage:ConnectionString is not configured.");
        var containerName = configuration["BlobStorage:ContainerName"] ?? "3d-models";

        var serviceClient = new BlobServiceClient(connectionString);
        _containerClient = serviceClient.GetBlobContainerClient(containerName);

        // Azure storage account has allowBlobPublicAccess: false — always create with None.
        // In development, we attempt to grant public access on the local Azurite container
        // so the Next.js dev blob proxy can serve images directly. Wrapped in try/catch
        // because Azurite versions vary in their support for SetAccessPolicy.
        _containerClient.CreateIfNotExists(PublicAccessType.None);

        if (_isDevelopment)
        {
            _logger.LogInformation("Blob storage initialized in development mode. Container: {ContainerName}", containerName);
            try { _containerClient.SetAccessPolicy(PublicAccessType.Blob); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not set public access policy on dev container — blob proxy may not serve images.");
            }
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string blobName, string contentType)
    {
        if (_isDevelopment)
        {
            _logger.LogInformation("Uploading blob (development mode): {BlobName}", blobName);
        }

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

    public async Task StageBlockAsync(string blobName, string blockId, Stream blockData)
    {
        var blobClient = _containerClient.GetBlockBlobClient(blobName);
        await blobClient.StageBlockAsync(blockId, blockData);
        _logger.LogDebug("Staged block {BlockId} for blob {BlobName}", blockId, blobName);
    }

    public async Task<string> CommitBlocksAsync(
        string blobName, IReadOnlyList<string> blockIds, string contentType)
    {
        var blobClient = _containerClient.GetBlockBlobClient(blobName);
        await blobClient.CommitBlockListAsync(blockIds, new BlobHttpHeaders
        {
            ContentType = contentType,
        });

        _logger.LogInformation(
            "Committed {BlockCount} blocks for blob {BlobName}", blockIds.Count, blobName);

        return blobClient.Uri.ToString();
    }
}