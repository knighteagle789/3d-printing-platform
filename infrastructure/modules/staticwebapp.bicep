@description('Azure region for all resources.')
param location string

@description('Short environment tag (dev | prod).')
param environmentName string

@description('Base name shared across all resources.')
param appName string

@description('Full URL of the API, injected as NEXT_PUBLIC_API_URL.')
param apiUrl string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${appName}-web-${environmentName}'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {}
  }
  tags: {
    environment: environmentName
    project: appName
  }
}

resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  name: 'appsettings'
  parent: staticWebApp
  properties: {
    NEXT_PUBLIC_API_URL: apiUrl
  }
}

output webHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
@secure()
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
