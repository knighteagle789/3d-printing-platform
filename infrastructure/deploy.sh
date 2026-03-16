#!/usr/bin/env bash
set -euo pipefail

APP_NAME="noco-make-lab"
ENVIRONMENT="dev"
RESOURCE_GROUP="rg-${APP_NAME}-${ENVIRONMENT}"
LOCATION="eastus2"
TEMPLATE="$(dirname "$0")/main.bicep"
PARAMS="$(dirname "$0")/main.bicepparam"

bold()  { echo -e "\033[1m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }

prompt_secret() {
  local var_name="$1" prompt_text="$2" value=""
  while [ -z "$value" ]; do
    read -rsp "  ${prompt_text}: " value; echo
    [ -z "$value" ] && yellow "  Value cannot be empty. Try again."
  done
  eval "$var_name='$value'"
}

prompt_optional() {
  local var_name="$1" prompt_text="$2" value=""
  read -rsp "  ${prompt_text} (Enter to skip): " value; echo
  eval "$var_name='${value:-}'"
}

bold "\n🔐  Checking Azure login..."
az account show &>/dev/null || az login
green "  ✓ Signed in — $(az account show --query name -o tsv)"

bold "\n🔑  Enter secrets (hidden, never saved to disk):"
prompt_secret DB_ADMIN_PASSWORD "PostgreSQL admin password"
prompt_secret JWT_KEY           "JWT signing key (32+ chars)"
prompt_optional RESEND_KEY      "Resend API key"
prompt_optional STRIPE_SECRET   "Stripe secret key"
prompt_optional STRIPE_WEBHOOK  "Stripe webhook secret"

bold "\n📦  Creating resource group '${RESOURCE_GROUP}'..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
green "  ✓ Resource group ready"

bold "\n🚀  Deploying Bicep (5–10 min, PostgreSQL is the slow step)..."
DEPLOYMENT_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$TEMPLATE" \
  --parameters "$PARAMS" \
  --parameters \
    dbAdminPassword="$DB_ADMIN_PASSWORD" \
    jwtKey="$JWT_KEY" \
    resendApiKey="${RESEND_KEY:-}" \
    stripeSecretKey="${STRIPE_SECRET:-}" \
    stripeWebhookSecret="${STRIPE_WEBHOOK:-}" \
  --query "properties.outputs" \
  --output json)

API_URL=$(echo "$DEPLOYMENT_OUTPUT"       | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty apiUrl | Select-Object -ExpandProperty value")
WEB_URL=$(echo "$DEPLOYMENT_OUTPUT"       | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty webUrl | Select-Object -ExpandProperty value")
POSTGRES_HOST=$(echo "$DEPLOYMENT_OUTPUT" | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty postgresHost | Select-Object -ExpandProperty value")
SWA_TOKEN=$(echo "$DEPLOYMENT_OUTPUT"     | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty staticWebAppDeployToken | Select-Object -ExpandProperty value")
API_APP_NAME=$(echo "$DEPLOYMENT_OUTPUT"  | powershell -Command "$input | ConvertFrom-Json | Select-Object -ExpandProperty apiWebAppName | Select-Object -ExpandProperty value")

green "\n✅  Deployment complete!\n"
bold "API:      ${API_URL}"
bold "Frontend: ${WEB_URL}"
bold "Database: ${POSTGRES_HOST}"

bold "\n─── Add these GitHub Secrets ────────────────────────────────────────────────"
yellow "  AZURE_STATIC_WEB_APPS_API_TOKEN = ${SWA_TOKEN}"
yellow "  NEXT_PUBLIC_API_URL             = ${API_URL}"

bold "\n─── Download API publish profile ────────────────────────────────────────────"
bold "  az webapp deployment list-publishing-profiles \\"
bold "    --name ${API_APP_NAME} --resource-group ${RESOURCE_GROUP} --xml \\"
bold "    > publish-profile.xml"
yellow "  Then add contents as secret AZURE_API_PUBLISH_PROFILE, then delete the file."

bold "\n─── Run EF migrations against Azure Postgres ────────────────────────────────"
bold "  cd src/api && dotnet ef database update \\"
bold "    --project PrintHub.Infrastructure --startup-project PrintHub.API"
echo "  (set ConnectionStrings__DefaultConnection env var to the Azure connection string first)"

bold "\n─── Finally: uncomment the deploy jobs in both workflow files and push. ─────"