@description('Azure region for all resources.')
param location string

@description('Short environment tag (dev | prod).')
param environmentName string

@description('Base name shared across all resources.')
param appName string

@secure()
param dbConnectionString string

@secure()
param blobConnectionString string

param blobContainerName string

@secure()
param jwtKey string

param jwtIssuer string
param jwtAudience string

@secure()
param resendApiKey string

@secure()
param stripeSecretKey string

@secure()
param stripeWebhookSecret string

param webAppRul string

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-${appName}-${environmentName}'
  location: location
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${appName}-api-${environmentName}'
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: false
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT',        value: environmentName == 'prod' ? 'Production' : 'Staging' }
        { name: 'BlobStorage__ConnectionString', value: blobConnectionString }
        { name: 'BlobStorage__ContainerName',    value: blobContainerName }
        { name: 'Jwt__Key',                      value: jwtKey }
        { name: 'Jwt__Issuer',                   value: jwtIssuer }
        { name: 'Jwt__Audience',                 value: jwtAudience }
        { name: 'Email__ResendApiKey',           value: resendApiKey }
        { name: 'Stripe__SecretKey',             value: stripeSecretKey }
        { name: 'Stripe__WebhookSecret',         value: stripeWebhookSecret }
        { name: 'WebAppUrl',                     value: webAppUrl }
      ]
      connectionStrings: [
        {
          name: 'DefaultConnection'
          connectionString: dbConnectionString
          type: 'PostgreSQL'
        }
      ]
    }
  }
  tags: {
    environment: environmentName
    project: appName
  }
}

output apiHostname string = webApp.properties.defaultHostName
output webAppName string = webApp.name