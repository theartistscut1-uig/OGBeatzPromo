/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AZURE_FUNCTION_APP_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: {
            access_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
          }) => void;
          error_callback?: (error: { type: string }) => void;
        }) => {
          requestAccessToken: (options?: { prompt?: string }) => void;
        };
      };
    };
  };
}
