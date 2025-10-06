"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GAPI_URL = "https://apis.google.com/js/api.js";
const GIS_URL = "https://accounts.google.com/gsi/client";
const SCOPES =
  "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file";

type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  webContentLink?: string;
};

async function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function PickerPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY!;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await loadScript(GIS_URL);
        await loadScript(GAPI_URL);
        await new Promise<void>((res) => window.gapi.load("client:picker", () => res()));
        await window.gapi.client.init({ apiKey });

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp?.access_token) tokenRef.current = resp.access_token;
          },
        });

        const token = await getAccessToken("").catch(async () => getAccessToken("consent"));
        await openPicker(token);
      } catch (e: any) {
        setError(e?.message || "Failed to open Google Picker");
      }
    })();
  }, []);

  function getAccessToken(prompt: "" | "consent") {
    return new Promise<string>((resolve, reject) => {
      const tc = tokenClientRef.current;
      if (!tc) return reject(new Error("Token client not initialized"));
      tokenRef.current = null;
      tc.requestAccessToken({ prompt });
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (tokenRef.current) {
          clearInterval(iv);
          resolve(tokenRef.current);
        } else if (tries > 80) {
          clearInterval(iv);
          reject(new Error("OAuth token timeout"));
        }
      }, 100);
    });
  }

  async function openPicker(accessToken: string) {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes("image/png,image/jpeg,image/jpg,image/webp");

    const uploadView = new window.google.picker.DocsUploadView();

    const picker = new window.google.picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken)
      .setOrigin(window.location.origin)
      .addView(view)
      .addView(uploadView)
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => {
        if (data.action !== window.google.picker.Action.PICKED) {
          postToOpener({ type: "GOOGLE_PICKER_CANCELLED" });
          window.close();
          return;
        }
        const files: PickedFile[] = data.docs.map((d: any) => ({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          thumbnailUrl: d.thumbnailUrl,
          webViewLink: d.url,
        }));
        postToOpener({ type: "GOOGLE_PICKER_RESULT", files });
        window.close();
      })
      .build();

    picker.setVisible(true);
  }

  function postToOpener(payload: unknown) {
    if (window.opener) window.opener.postMessage(payload, "*");
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p>{error ? `Error: ${error}` : "Initializing Google Picker..."}</p>
    </div>
  );
}
