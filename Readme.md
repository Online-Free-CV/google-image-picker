# 🖼️ @onlinefreecv/google-image-picker

A lightweight **Google Drive Image Picker** for React and Next.js — built for the **OnlineFreeCV** ecosystem but usable in any project.

It lets users pick or upload images from their **Google Drive**, automatically sets them to public access, and returns stable URLs that can be used directly in `<img>` or `<Image>` tags.

---

## 🚀 Installation

```bash
pnpm add @onlinefreecv/google-image-picker
# or
npm install @onlinefreecv/google-image-picker
# or
yarn add @onlinefreecv/google-image-picker
```

## ⚙️ Google Cloud Setup

Go to **Google Cloud Console → APIs & Services**

### Enable:
- Google Picker API  
- Google Drive API  

### Create a Web OAuth Client ID:
Authorized JavaScript origins → add:
```
http://localhost:3000
https://yourdomain.com
```

### Create an API key and restrict it:
- Restrict usage to **Google Picker API**  
- Add the same web origins  

### Copy both:
- **Client ID**  
- **API Key**

----

```tsx
"use client";

import { GoogleImagePicker, PickedFile } from "@onlinefreecv/google-image-picker";

export default function ProfileImagePicker() {
  const handlePicked = (files: PickedFile[]) => {
    console.log("Picked files:", files);
    // Each file includes:
    // id, name, mimeType, thumbnailUrl, publicUrl
  };

  return (
    <GoogleImagePicker
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY!}
      clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
      scopes="https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file"
      onPicked={handlePicked}
      photoSize={400} // custom image resolution
    >
      <button className="btn">Pick from Google Drive</button>
    </GoogleImagePicker>
  );
}

```

## 📸 Returned File Object

Each selected file returns the following fields:

| Field          | Type     | Description                                                                                |
| -------------- | -------- | ------------------------------------------------------------------------------------------ |
| `id`           | `string` | Google Drive File ID                                                                       |
| `name`         | `string` | File name                                                                                  |
| `mimeType`     | `string` | MIME type (e.g. `image/png`)                                                               |
| `thumbnailUrl` | `string` | Drive thumbnail (lightweight preview)                                                      |
| `publicUrl`    | `string` | Stable public image URL usable in `<img>` tags                                             |
| `webViewLink`  | `string` | Google Drive viewer page (optional)                                                        |
| `displayUrl`   | `string` | Optimized image URL for embedding (from `lh3.googleusercontent.com`, respects `photoSize`) |


**Example public image URL:**
```
https://lh3.googleusercontent.com/d/<FILE_ID>=s<SIZE>
```

## 🧠 Notes

- The package automatically ensures uploads go into an **"OnlineFreeCV Public"** folder with public read access.  
- Images are returned with shareable **drive.google.com** links (not flaky `usercontent` links).  
- Works fully **client-side** in **Next.js (app directory)** and **React 18+**.

## 🧱 Example with Next.js `<Image />`

In `next.config.js`, allow the required domains:

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'drive.google.com' },
    { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
  ],
},
```

Then use:

```tsx
<Image
  src={file.publicUrl!}
  width={200}
  height={200}
  alt="Profile Image"
  unoptimized
/>
```

## 👨‍💻 Developed & Maintained By

**Developed by:** [Liaqat Saeed](https://www.linkedin.com/in/liaqat-saeed)  
**Maintained by:** OnlineFreeCV Team  
**Contact:** support@onlinefreecv.com  
**License:** MIT

would you like me to add a **“Publishing Guide”** section too (showing how you publish via GitHub Actions using `pnpm publish --provenance`)?