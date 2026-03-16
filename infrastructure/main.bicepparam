using './main.bicep'

param environmentName   = 'dev'
param appName           = 'noco-make-lab'
param dbAdminUsername   = 'nocomakelab_admin'
param databaseName      = 'nocoMakeLab'
param blobContainerName = '3d-models'

// Secrets — pass these on the CLI or let deploy.sh prompt for them. Never fill in here.
param dbAdminPassword     = ''
param jwtKey              = ''
param resendApiKey      = ''
param stripeSecretKey     = ''
param stripeWebhookSecret = ''