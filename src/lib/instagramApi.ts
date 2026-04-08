import { getFunctionUrl } from "./backendConfig";

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export type InstagramConnectResult = {
  profile: {
    id: string;
    username: string;
    account_type?: string;
    media_count?: number;
  };
  media: InstagramMediaItem[];
};

export async function connectInstagram(accessToken: string): Promise<InstagramConnectResult> {
  const response = await fetch(getFunctionUrl("instagram-connect"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  const payload = await response.json() as InstagramConnectResult | { error?: string };

  if (!response.ok) {
    throw new Error("error" in payload ? payload.error || "Instagram connection failed." : "Instagram connection failed.");
  }

  return payload as InstagramConnectResult;
}

export type InstagramOAuthResult = {
  accessToken: string;
  pageId: string;
  profile: {
    id: string;
    username: string;
    account_type?: string;
    media_count?: number;
    profile_picture_url?: string;
  };
  media: InstagramMediaItem[];
};

export function startInstagramLogin() {
  window.location.href = getFunctionUrl("instagram-auth-start");
}

export function readInstagramOAuthResultFromUrl(): { data?: InstagramOAuthResult; error?: string } {
  const url = new URL(window.location.href);
  const oauthPayload = url.searchParams.get("instagram_oauth");
  const oauthError = url.searchParams.get("instagram_error");

  if (oauthError) {
    url.searchParams.delete("instagram_error");
    window.history.replaceState({}, document.title, url.toString());
    return { error: oauthError };
  }

  if (!oauthPayload) {
    return {};
  }

  try {
    const normalized = oauthPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as InstagramOAuthResult;
    url.searchParams.delete("instagram_oauth");
    window.history.replaceState({}, document.title, url.toString());
    return { data: decoded };
  } catch {
    url.searchParams.delete("instagram_oauth");
    window.history.replaceState({}, document.title, url.toString());
    return { error: "Instagram login response could not be read." };
  }
}
