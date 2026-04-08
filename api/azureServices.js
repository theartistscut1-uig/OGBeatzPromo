import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from "@azure/storage-blob";
import { Pool } from "pg";

const MUSICFORGE_STATE_ID = 1;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function defaultMusicforgeData() {
  return {
    album_covers: [],
    video_concepts: [],
    social_posts: [],
    keywords: [],
    ai_chat: [],
    assets: [],
    connected_accounts: [],
  };
}

function parseConnectionString(connectionString) {
  const result = {};

  for (const part of connectionString.split(";")) {
    const [key, ...rest] = part.split("=");
    if (!key || rest.length === 0) {
      continue;
    }

    result[key.toLowerCase()] = rest.join("=");
  }

  return result;
}

function getStorageConfig() {
  const connectionString = getRequiredEnv("AZURE_STORAGE_CONNECTION_STRING");
  const parsed = parseConnectionString(connectionString);
  const accountName = parsed.accountname;
  const accountKey = parsed.accountkey;
  const blobEndpoint = parsed.blobendpoint || (accountName ? `https://${accountName}.blob.core.windows.net` : "");

  if (!accountName || !accountKey) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING must include AccountName and AccountKey.");
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);

  return {
    accountName,
    accountKey,
    blobEndpoint,
    credential,
    serviceClient,
  };
}

let blobClientPromise = null;

async function getBlobServiceClient() {
  if (!blobClientPromise) {
    blobClientPromise = Promise.resolve(getStorageConfig().serviceClient);
  }

  return blobClientPromise;
}

async function ensureContainer(containerName) {
  const client = await getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

function getReadWriteSasUrl(blobClient, credential) {
  const sas = generateBlobSASQueryParameters(
    {
      containerName: blobClient.containerName,
      blobName: blobClient.name,
      permissions: BlobSASPermissions.parse("racw"),
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    credential
  ).toString();

  return `${blobClient.url}?${sas}`;
}

export async function createBlobUploadUrl({ container, folder, fileName, contentType }) {
  const { credential } = getStorageConfig();
  const containerClient = await ensureContainer(container);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobPath = `${folder.replace(/\/+$/, "")}/${Date.now()}-${safeName}`;
  const blobClient = containerClient.getBlockBlobClient(blobPath);

  return {
    blobPath,
    uploadUrl: getReadWriteSasUrl(blobClient, credential),
    blobUrl: getReadWriteSasUrl(blobClient, credential),
  };
}

function getPool() {
  const connectionString = getRequiredEnv("POSTGRES_CONNECTION_STRING");
  const pool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
  });

  return pool;
}

let pool;

async function getDbPool() {
  if (!pool) {
    pool = getPool();
  }

  return pool;
}

async function ensureSchema() {
  const db = await getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS musicforge_state (
      id INTEGER PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function normalizeAssetUrls(asset, credential) {
  if (!asset || typeof asset !== "object") {
    return asset;
  }

  if (asset.type !== "uploaded_video" || !asset.blobPath) {
    return asset;
  }

  const { accountName, blobEndpoint } = getStorageConfig();
  const [containerName, ...pathParts] = String(asset.blobPath).split("/");
  const blobName = pathParts.join("/");
  if (!containerName || !blobName) {
    return asset;
  }

  const blobClient = new BlobServiceClient(blobEndpoint, credential).getContainerClient(containerName).getBlockBlobClient(blobName);
  return {
    ...asset,
    videoUrl: getReadWriteSasUrl(blobClient, credential),
  };
}

function normalizePayload(payload) {
  const data = {
    ...defaultMusicforgeData(),
    ...payload,
  };

  if (Array.isArray(data.assets)) {
    const { credential } = getStorageConfig();
    data.assets = data.assets.map((asset) => normalizeAssetUrls(asset, credential));
  }

  return data;
}

export async function loadMusicforgeState() {
  await ensureSchema();
  const db = await getDbPool();
  const result = await db.query("SELECT payload FROM musicforge_state WHERE id = $1", [MUSICFORGE_STATE_ID]);
  const payload = result.rows[0]?.payload;
  return payload ? normalizePayload(payload) : defaultMusicforgeData();
}

export async function saveMusicforgeState(payload) {
  await ensureSchema();
  const db = await getDbPool();
  const normalized = normalizePayload(payload);
  await db.query(
    `
      INSERT INTO musicforge_state (id, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [MUSICFORGE_STATE_ID, JSON.stringify(normalized)]
  );

  return normalized;
}
