@description('Azure region for all resources.')
param location string

@description('Short environment tag (dev | prod).')
param environmentName string

@description('Base name shared across all resources.')
param appName string

// ── Computer Vision resource ──────────────────────────────────────────────────
//
// Azure AI Vision 4.0 Image Analysis (api-version=2024-02-01) uses the
// standard ComputerVision Cognitive Services endpoint:
//   https://<name>.cognitiveservices.azure.com/
//
// Supported regions for Image Analysis 4.0: eastus, westus, westeurope,
// westus2, eastasia, southeastasia, and others — confirm at:
//   https://learn.microsoft.com/azure/ai-services/computer-vision/overview-image-analysis
//
// SKU options:
//   F0 — Free tier: 5,000 transactions/month, 20 calls/minute (1 free per subscription/region)
//   S1 — Pay-per-use: $1.00/1,000 transactions (use for prod if volume warrants it)
//
var visionResourceName = '${appName}-vision-${environmentName}'

resource computerVision 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: visionResourceName
  location: location
  kind: 'ComputerVision'
  sku: {
    name: environmentName == 'prod' ? 'S1' : 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    // Disabling local (key) auth would require managed identity wiring; keep enabled
    // for the simple key-based flow the AzureVisionExtractionProvider uses.
    disableLocalAuth: false
  }
  tags: {
    environment: environmentName
    project: appName
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output endpoint string = computerVision.properties.endpoint

@secure()
output key string = computerVision.listKeys().key1
