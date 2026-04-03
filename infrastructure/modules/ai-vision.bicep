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
//   https://<subdomain>.cognitiveservices.azure.com/
//
// customSubDomainName is REQUIRED to get that format. Without it, Azure returns
// the old regional endpoint (https://<region>.api.cognitive.microsoft.com/)
// which does NOT work with Image Analysis 4.0.
// Must be globally unique, lowercase, max 24 chars, letters/numbers/hyphens only.
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
var visionSubdomainName = toLower(take(replace(visionResourceName, '-', ''), 24))

resource computerVision 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: visionResourceName
  location: location
  kind: 'ComputerVision'
  sku: {
    name: environmentName == 'prod' ? 'S1' : 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: visionSubdomainName
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
