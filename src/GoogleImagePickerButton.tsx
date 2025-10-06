"use client";
import * as React from "react";

export type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  webContentLink?: string;
};

export type GoogleImagePickerButtonProps = {
  popupOrigin: string;
  onPicked: (files: PickedFile[]) => void;
  onChange?: (url?: string, file?: PickedFile) => void;
  className?: string;                 // <-- optional
  label?: string;                     // <-- optional
  children?: React.ReactNode;         // <-- optional
};

export default function GoogleImagePickerButton({
  popupOrigin,
  onPicked,
  onChange,
  className = "",                     // safe default
  label = "Pick from Google Drive",
  children,
}: GoogleImagePickerButtonProps) {
  const [opening, setOpening] = React.useState(false);
  const popupRef = React.useRef<Window | null>(null);
  const intervalRef = React.useRef<number | null>(null);

  const cleanup = React.useCallback(() => {
    setOpening(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    } catch {}
    popupRef.current = null;
  }, []);

  const onMessage = React.useCallback(
    (e: MessageEvent) => {
      if (e.origin !== popupOrigin) return;
      const data = e.data || {};
      if (data?.type === "GOOGLE_PICKER_RESULT" && Array.isArray(data.files)) {
        cleanup();
        const files = data.files as PickedFile[];
        onPicked(files);
        if (onChange) {
          const first = files[0];
          const url = first?.thumbnailUrl ?? first?.webViewLink ?? first?.webContentLink;
          onChange(url, first);
        }
      } else if (data?.type === "GOOGLE_PICKER_CANCELLED") {
        cleanup();
      }
    },
    [cleanup, onPicked, onChange, popupOrigin]
  );

  React.useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      cleanup();
    };
  }, [onMessage, cleanup]);

  function openPopup() {
    if (!popupOrigin) return;
    const w = 720, h = 600;
    const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 80;
    const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 80;
    popupRef.current = window.open(`${popupOrigin.replace(/\/+$/, "")}/picker`, "ofcv_google_picker",
      `popup=yes,width=${w},height=${h},left=${x},top=${y}`);
    setOpening(true);
    intervalRef.current = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) cleanup();
    }, 500);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPopup}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPopup()}
      aria-disabled={opening}
      className={className || "inline-block cursor-pointer select-none"}
      style={{ outline: "none" }}
    >
      {children ?? (
        <span className="px-4 py-2 inline-block rounded-2xl shadow">
          {opening ? "Opening Google…" : label}
        </span>
      )}
    </div>
  );
}
