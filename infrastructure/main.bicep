targetScope = 'resourceGroup'

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Short environment tag (dev | prod).')
@allowed(['dev', 'prod'])
param environmentName string = 'dev'

@description('Base name used to derive all resource names.')
param appName string = 'noco-make-lab'

@description('PostgreSQL administrator username.')
param dbAdminUsername string = 'nocomakelab_admin'

@description('PostgreSQL administrator password.')
@secure()
param dbAdminPassword string

@description('Application database name.')
param databaseName string = 'nocoMakeLab'

@description('Blob container name for 3D model uploads.')
param blobContainerName string = '3d-models'

@description('JWT signing key — use a long random string (32+ chars).')
@secure()
param jwtKey string

@description('SendGrid API key for outbound email.')
@secure()
param resendApiKey string = ''

@description('Stripe secret key.')
@secure()
param stripeSecretKey string = ''

@description('Stripe webhook secret.')
@secure()
param stripeWebhookSecret string = ''

// ── Storage ───────────────────────────────────────────────────────────────────

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    environmentName: environmentName
    appName: appName
    containerName: blobContainerName
  }
}

// ── PostgreSQL ────────────────────────────────────────────────────────────────

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    environmentName: environmentName
    appName: appName
    adminUsername: dbAdminUsername
    adminPassword: dbAdminPassword
    databaseName: databaseName
  }
}

// ── App Service (API) ─────────────────────────────────────────────────────────

var apiHostname = '${appName}-api-${environmentName}.azurewebsites.net'
var apiUrl = 'https://${apiHostname}/api/v1'
param webHostname string = '${appName}-web-${environmentName}.azurestaticapps.net'
var webUrl = 'https://${webHostname}'

module appService 'modules/appservice.bicep' = {
  name: 'appservice'
  params: {
    location: location
    environmentName: environmentName
    appName: appName
    dbConnectionString: postgres.outputs.connectionString
    blobConnectionString: storage.outputs.connectionString
    blobContainerName: blobContainerName
    jwtKey: jwtKey
    jwtIssuer: apiUrl
    jwtAudience: webUrl
    resendApiKey: resendApiKey
    stripeSecretKey: stripeSecretKey
    stripeWebhookSecret: stripeWebhookSecret
    webAppUrl: webUrl
  }
}

// ── Static Web App (frontend) ─────────────────────────────────────────────────

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticwebapp'
  params: {
    location: location
    environmentName: environmentName
    appName: appName
    apiUrl: apiUrl
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output apiUrl string = apiUrl
output webUrl string = webUrl
output postgresHost string = postgres.outputs.serverFqdn
output storageAccountName string = storage.outputs.storageAccountName
@secure()
output staticWebAppDeployToken string = staticWebApp.outputs.deploymentToken
output apiWebAppName string = appService.outputs.webAppName