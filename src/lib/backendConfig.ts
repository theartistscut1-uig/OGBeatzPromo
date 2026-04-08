function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureApiSuffix(value: string) {
  const trimmed = trimTrailingSlash(value);
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export function getFunctionsBaseUrl() {
  const explicit = import.meta.env.DEV
    ? import.meta.env.VITE_AZURE_FUNCTION_APP_URL || import.meta.env.VITE_API_BASE_URL
    : "";

  if (explicit) {
    return ensureApiSuffix(explicit);
  }

  return "/api";
}

export function getFunctionUrl(name: string) {
  return `${getFunctionsBaseUrl()}/${name}`;
}
