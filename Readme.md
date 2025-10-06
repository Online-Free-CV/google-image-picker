# @onlinefreecv/google-image-picker

A lightweight, plug-and-play **Google Drive Image Picker** component for React and Next.js.  
Built for the OnlineFreeCV ecosystem — works out of the box with OAuth and Picker APIs.

---

## ✨ Features

- Google Drive + Upload Picker integration  
- React 18 / Next.js App Router compatible  
- `"use client"` ready (supports React hooks)  
- Works across subdomains (multi-tenant apps)  
- Supports custom children (e.g. `<Image>` placeholder or preview)  
- Safe popupOrigin validation to prevent invalid URLs  

---

## 🚀 Installation

Using **pnpm** (recommended):

```bash
pnpm add @onlinefreecv/google-image-picker
```

using **npm**:

```bash
npm install @onlinefreecv/google-image-picker
```

## Google Cloud Setup

1. Go to [Google Cloud Console → APIs & Services](https://console.cloud.google.com/apis/dashboard)

2. Enable the following APIs:
   - Google Picker API  
   - Google Drive API

3. Create a Web OAuth Client ID:
   - In **Credentials**, click **Create Credentials → OAuth Client ID**
   - Application type: **Web Application**
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3000`
     - Your deployed origins, for example: `https://username.onlinefreecv.com`

4. Create an API key:
   - In **Credentials**, click **Create Credentials → API key**
   - Restrict the key to:
     - **API restriction:** Google Picker API
     - **Website restrictions:** Add the same origins as above

5. Copy your **API key** and **Client ID** for use in your `.env.local` file.

## Environment Variables

Create a `.env.local` file in your Next.js app and add the following:

```yaml
NEXT_PUBLIC_GOOGLE_API_KEY=YOUR_RESTRICTED_API_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
NEXT_PUBLIC_PICKER_ORIGIN=http://localhost:3000
```
**Important:** Do not include inline comments or spaces — they will break the URL when opening the popup.

## Usage

### 1. Add a Picker Route

In your Next.js app (App Router):

```tsx
"use client";
import { PickerPage } from "@onlinefreecv/google-image-picker";
export default PickerPage;
```

### 2. Use the Button Component

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GoogleImagePickerButton,
  type PickedFile,
} from "@onlinefreecv/google-image-picker";

export default function AvatarField({ values }: { values: { name: string } }) {
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const profileImageStyle =
    "rounded-xl overflow-hidden w-[200px] h-[200px] grid place-items-center bg-neutral-200";

  return (
    <GoogleImagePickerButton
      popupOrigin={process.env.NEXT_PUBLIC_PICKER_ORIGIN || ""}
      onPicked={(files: PickedFile[]) => {
        console.log("Picked files:", files);
        const first = files[0];
        const url =
          first?.thumbnailUrl ?? first?.webViewLink ?? first?.webContentLink;
        setImageUrl(url);
      }}
      onChange={(url) => setImageUrl(url)} // optional helper for single URL
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          width={200}
          height={200}
          className={profileImageStyle}
          alt={values.name}
          unoptimized
        />
      ) : (
        <div className={profileImageStyle}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="200"
            height="200"
            viewBox="0 0 200 200"
            fill="none"
            style={{ borderRadius: "1rem" }}
          >
            <rect
              width="200"
              height="200"
              fill="#e0e0e0"
              rx="var(--tokens-radii-md)"
            />
            <circle cx="100" cy="70" r="30" fill="#aaa" />
            <path
              d="M50 160c0-27.6 22.4-50 50-50s50 22.4 50 50"
              fill="#aaa"
            />
          </svg>
        </div>
      )}
    </GoogleImagePickerButton>
  );
}
```

## Returned File Format

```ts
type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  webContentLink?: string;
};

```

## Notes

- Only image MIME types (image/png, image/jpeg, image/webp) are displayed in the picker.
- The popup automatically closes when cancelled or after a selection.
- onPicked returns an array of files; onChange provides a shortcut for the first file’s URL.
- If you need permanent or public URLs, copy files to your own storage; Google Drive links may require authentication.

## Local Development (Contributors)
If you are developing or linking this package locally:

```bash
pnpm install
pnpm build
pnpm link --global
```

Then, inside your Next.js app:
```bash
pnpm link --global @onlinefreecv/google-image-picker
```

To unlink later:
```bash
pnpm unlink --global @onlinefreecv/google-image-picker
```

## License

MIT © OnlineFreeCV 2025

## Changelog Highlights

**v1.0.1**

- Fixed React type conflicts between package and Next.js app  
- Added safe URL validation for popup origin  
- Ensured `"use client"` directive for PickerPage  
- Improved children typing and React 18.2 compatibility  

---

### Example Demo (Next.js 13.4.19)

```bash
pnpm dev
# then open http://localhost:3000/picker
```
---
## 👤 Author

- **Liaqat Saeed**
  - [Linkedin](https://pk.linkedin.com/in/liaqat-saeed)
  - [GitHub](https://github.com/liaqatsaeed)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.
