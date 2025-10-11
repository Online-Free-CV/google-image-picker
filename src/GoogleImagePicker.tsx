"use client";

import React, { useRef, useState } from "react";
import "./style.css";

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
    displayUrl: string; // fallback <img src=...>
};

type Props = {
    apiKey: string;
    clientId: string;
    scopes: string;                 // e.g. "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file"
    onPicked: (files: PickedFile[]) => void;
    children: React.ReactNode;
    className?: string;
    photoSize?: number;            // default: 800
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

const toDisplayImageUrl = (id: string, size: number) =>
    `https://lh3.googleusercontent.com/d/${id}=s${size}`;

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

const DriveIcon = ({ size = 18 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 32 32" fill="none">
        <path d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z" fill="white" />
        <path d="M16.0019 12.4507L12.541 6.34297C12.6559 6.22598 12.7881 6.14924 12.9203 6.09766C11.8998 6.43355 11.4315 7.57961 11.4315 7.57961L5.10895 18.7345C5.01999 19.0843 4.99528 19.4 5.0064 19.6781H11.9072L16.0019 12.4507Z" fill="#34A853" />
        <path d="M16.002 12.4507L20.0967 19.6781H26.9975C27.0086 19.4 26.9839 19.0843 26.8949 18.7345L20.5724 7.57961C20.5724 7.57961 20.1029 6.43355 19.0835 6.09766C19.2145 6.14924 19.3479 6.22598 19.4628 6.34297L16.002 12.4507Z" fill="#FBBC05" />
        <path d="M16.0019 12.4514L19.4628 6.34371C19.3479 6.22671 19.2144 6.14997 19.0835 6.09839C18.9327 6.04933 18.7709 6.01662 18.5954 6.00781H18.4125H13.5913H13.4084C13.2342 6.01536 13.0711 6.04807 12.9203 6.09839C12.7894 6.14997 12.6559 6.22671 12.541 6.34371L16.0019 12.4514Z" fill="#188038" />
        <path d="M11.9082 19.6782L8.48687 25.7168C8.48687 25.7168 8.3732 25.6614 8.21875 25.5469C8.70434 25.9206 9.17633 25.9998 9.17633 25.9998H22.6134C23.3547 25.9998 23.5092 25.7168 23.5092 25.7168C23.5116 25.7155 23.5129 25.7142 23.5153 25.713L20.0965 19.6782H11.9082Z" fill="#4285F4" />
        <path d="M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z" fill="#1967D2" />
        <path d="M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z" fill="#EA4335" />
    </svg>
);

export const GoogleImagePicker: React.FC<Props> = ({
    apiKey,
    clientId,
    scopes,
    onPicked,
    children,
    className,
    photoSize = 400,
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
                            displayUrl: toDisplayImageUrl(d.id, photoSize), // fallback
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
            <div className="drive-overlay">
                <DriveIcon />
                <span>Choose from Drive</span>
            </div>
            <div className="picker-wrapper">
                {loading ? (
                    <div className="picker-loader">
                        <span>Connecting to Google…</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};
