AzureSetUp

Goal:
- keep cost low
- get the app hosted
- get storage ready
- get the backend ready
- get the database ready

## Before You Start

Make sure you have:

- an Azure account
- access to `portal.azure.com`
- this repo in GitHub if you want easy Static Web App deployment

## Step 1: Create The Resource Group

In Azure Portal:

1. Search `Resource groups`
2. Click `Create`
3. Enter:
   - Resource group: `rg-ogbeatz-prod`
   - Region: nearest region to you
4. Click `Review + create`
5. Click `Create`

Save:
- the resource group name

## Step 2: Create Storage Account

In Azure Portal:

1. Search `Storage accounts`
2. Click `Create`
3. Enter:
   - Resource group: `rg-ogbeatz-prod`
   - Storage account name: `stogbeatzmedia`
   - Region: same region as resource group
   - Performance: `Standard`
   - Redundancy: `LRS`
4. Click `Review`
5. Click `Create`

Save:
- storage account name

## Step 3: Create Blob Containers

Open your new storage account.

1. Click `Containers`
2. Create these containers:
   - `tracks`
   - `artwork`
   - `promo`
3. Leave access private

Do not make them public yet.

## Step 4: Create Static Web App

In Azure Portal:

1. Search `Satic Web Atpps`
2. Click `Create`
3. Enter:
   - Resource group: `rg-ogbeatz-prod`
   - Name: `swa-ogbeatz-hub`
   - Plan type: `Free`
4. If using GitHub:
   - connect GitHub
   - select your repo
   - branch: your main branch
5. Build details:
   - App location: `/`
   - API location: `api`
   - Output location: `dist`
6. Click `Review + create`
7. Click `Create`

Save:
- Static Web App name
- generated URL

## Step 5: Use The Repo API

The backend now lives in this repo under `api/` and deploys with the Static Web App.

Do not create a separate Function App unless you want to move the backend out of this repo later.

Make sure the workflow publishes the `api` folder as the API source.

## Step 6: Create PostgreSQL Database

In Azure Portal:

1. Search `Azure Database for PostgreSQL flexible server`
2. Click `Create`
3. Enter:
   - Resource group: `rg-ogbeatz-prod`
   - Server name: `psql-ogbeatz-db`
   - Region: same region
   - Workload type: `Development`
4. Authentication:
   - create admin username
   - create admin password
5. Compute:
   - choose smallest `Burstable`
6. Storage:
   - choose smallest practical storage
7. High availability:
   - `Disabled`
8. Click `Review + create`
9. Click `Create`

Save:
- database server name
- admin username
- admin password
- database hostname

## Step 7: Create Key Vault

In Azure Portal:

1. Search `Key Vaults`
2. Click `Create`
3. Enter:
   - Resource group: `rg-ogbeatz-prod`
   - Key Vault name: `kv-ogbeatz`
   - Pricing tier: `Standard`
4. Click `Review + create`
5. Click `Create`

Save:
- Key Vault name

## Step 8: Add Secrets To Key Vault

Add secrets for:

- PostgreSQL connection string
- storage connection string
- Meta app secret
- YouTube client secret
- AI keys if used

Do not store secrets in frontend files.

## Step 9: What To Ignore For Now

Do not turn on:

- high availability
- premium plans
- advanced networking
- extra replicas
- enterprise security extras you do not understand yet

Keep it small first.

## Step 10: What This Repo Needs Next

After Azure is ready, code work should happen in this order:

1. remove direct Supabase dependency from the frontend
2. keep the managed API deployment healthy
3. connect uploads to Blob Storage
4. connect app data to PostgreSQL
5. add release publishing workflow

## Resource Names Summary

Use these names if available:

- Resource Group: `rg-ogbeatz-prod`
- Storage Account: `stogbeatzmedia`
- Static Web App: `swa-ogbeatz-hub`
- PostgreSQL: `psql-ogbeatz-db`
- Key Vault: `kv-ogbeatz`

## When You Finish Azure Setup

You should have:

- one resource group
- one storage account
- three blob containers
- one static web app
- one managed API deployment
- one PostgreSQL server
- one key vault

Then the next step is code migration, not more portal clicking.
