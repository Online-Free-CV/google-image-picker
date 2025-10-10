"use client";

import React, { useRef, useState } from "react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl?: string;
  publicUrl?: string;  // <img src=...>
  webViewLink?: string;
};

type Props = {
  apiKey: string;
  clientId: string;
  scopes: string;                 // e.g. "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file"
  onPicked: (files: PickedFile[]) => void;
  children: React.ReactNode;
  className?: string;

  /** Option 1 settings */
  publicFolderId?: string;        // if you already know the folder id, pass it
  publicFolderName?: string;      // default: "OnlineFreeCV Public"
  ensurePublicFolder?: boolean;   // default: true (find/create + make public)
  limitBrowseToFolder?: boolean;  // default: true (also browse within folder)
};

const GAPI_URL = "https://apis.google.com/js/api.js";
const GIS_URL = "https://accounts.google.com/gsi/client";

function includesDriveFile(scopes: string) {
  return /\bhttps:\/\/www\.googleapis\.com\/auth\/drive\.file\b/.test(scopes);
}

const toPublicImageUrl = (id: string) =>
  `https://drive.usercontent.google.com/uc?id=${id}&export=view`;

async function loadScriptOnce(src: string) {
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

async function driveFetch<T = any>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} – ${text}`);
  }
  return res.json() as Promise<T>;
}

async function findFolderByName(name: string, token: string) {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`
  );
  const data = await driveFetch<{ files: Array<{ id: string; name: string }> }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    token
  );
  return data.files?.[0];
}

async function createFolder(name: string, token: string) {
  return driveFetch<{ id: string; name: string }>(
    `https://www.googleapis.com/drive/v3/files`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );
}

async function makeFolderPublic(folderId: string, token: string) {
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );
  // don’t throw if non-OK; orgs can block public sharing. The picker will still work; files just won’t be public.
}

export const GoogleImagePicker: React.FC<Props> = ({
  apiKey,
  clientId,
  scopes,
  onPicked,
  children,
  className,

  publicFolderId,
  publicFolderName = "OnlineFreeCV Public",
  ensurePublicFolder = true,
  limitBrowseToFolder = true,
}) => {
  const [loading, setLoading] = useState(false);

  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const ensuredFolderIdRef = useRef<string | null>(null);

  const initIfNeeded = async () => {
    if (initializedRef.current) return;
    await loadScriptOnce(GIS_URL);
    await loadScriptOnce(GAPI_URL);
    await new Promise<void>((res) => window.gapi.load("client:picker", () => res()));
    await window.gapi.client.init({ apiKey });

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (resp: any) => {
        if (resp?.access_token) {
          accessTokenRef.current = resp.access_token;
          openPicker(resp.access_token).catch((e) => {
            console.error(e);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      },
    });

    initializedRef.current = true;
  };

  const requestToken = () =>
    new Promise<string>((resolve, reject) => {
      accessTokenRef.current = null;
      tokenClientRef.current.requestAccessToken({ prompt: "" });

      const start = Date.now();
      const iv = setInterval(() => {
        if (accessTokenRef.current) {
          clearInterval(iv);
          resolve(accessTokenRef.current);
        } else if (Date.now() - start > 90_000) {
          clearInterval(iv);
          reject(new Error("OAuth token timeout/cancelled"));
        }
      }, 150);
    });

  const ensurePublicFolderId = async (token: string) => {
    // If user supplied an explicit folder id, optionally try to make it public.
    if (publicFolderId) {
      if (ensurePublicFolder && includesDriveFile(scopes)) {
        try {
          await makeFolderPublic(publicFolderId, token);
        } catch (e) {
          console.warn("Could not make provided folder public:", e);
        }
      }
      return publicFolderId;
    }

    if (!ensurePublicFolder) return null; // user doesn’t want auto folder

    if (!includesDriveFile(scopes)) {
      console.warn(
        "[GoogleImagePicker] ensurePublicFolder=true requires drive.file scope; continuing without."
      );
      return null;
    }

    // Find or create the folder
    try {
      const existing = await findFolderByName(publicFolderName, token);
      const folder =
        existing ?? (await createFolder(publicFolderName, token));
      try {
        await makeFolderPublic(folder.id, token);
      } catch (e) {
        console.warn(
          "Folder public sharing may be restricted by org/shared drive policy:",
          e
        );
      }
      return folder.id;
    } catch (e) {
      console.warn("Failed to ensure public folder:", e);
      return null;
    }
  };

  const openPicker = async (accessToken: string) => {
    const google = window.google;

    // Optionally scope to a public folder (for uploads and browse)
    if (ensuredFolderIdRef.current === null) {
      ensuredFolderIdRef.current = await ensurePublicFolderId(accessToken);
    }
    const folderId = ensuredFolderIdRef.current;

    // Browse (images). Limit to folder when requested & supported.
    const imagesView = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    if (limitBrowseToFolder && folderId) {
      // setParent is supported by DocsView to scope the view
      imagesView.setParent(folderId);
    }

    const builder = new google.picker.PickerBuilder()
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken)
      .addView(imagesView)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED);

    // Upload tab → send new files to our public folder so they inherit sharing
    if (includesDriveFile(scopes)) {
      const uploadView = new google.picker.DocsUploadView();
      if (folderId) uploadView.setParent(folderId);
      builder.addView(uploadView);
    }

    const picker = builder
      .setCallback(async (data: any) => {
        try {
          if (!data) return;
          const Action = google.picker.Action;
          if (data.action === Action.CANCEL) return;

          if (data.action === Action.PICKED) {
            const token = accessTokenRef.current!;
            const docs = data.docs || [];
            const files: PickedFile[] = docs.map((d: any) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
              thumbnailUrl: d.thumbnailUrl,
              webViewLink: d.url,             // viewer
              publicUrl: toPublicImageUrl(d.id), // display directly
            }));
            // NOTE: if org forbids public sharing, uploads to folder may still be private.
            // In that case, consider a fallback: copy to your CDN.
            onPicked(files);
          }
        } finally {
          setLoading(false);
        }
      })
      .build();

    picker.setVisible(true);
  };

  const handleClick = async () => {
    try {
      setLoading(true);
      await initIfNeeded();
      await requestToken(); // openPicker runs in the token callback
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={className}
      style={{ cursor: "pointer", display: "inline-block" }}
    >
      {loading ? <span>Connecting to Google…</span> : children}
    </div>
  );
};
