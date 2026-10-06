export function generateId() {
  if (window.crypto && window.crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function truncate(text, len = 60) {
  if (!text) return "";
  return text.length > len ? text.slice(0, len) + "…" : text;
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function downloadFile(dataUrl, fileName) {
  if (!dataUrl) return;
  try {
    // If it's a base64 Data URL, convert to Blob for seamless native downloading across iOS/Android/Desktop
    if (dataUrl.startsWith("data:")) {
      const parts = dataUrl.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }

    // Direct URL fallback
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName || "download";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Download failed:", err);
    window.open(dataUrl, "_blank");
  }
}

export async function compressImageFile(file, maxDimension = 1920, quality = 0.85) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: reader.result, size: file.size, type: file.type });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxDimension && height <= maxDimension && file.size < 600 * 1024) {
          resolve({ data: e.target.result, size: file.size, type: file.type });
          return;
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(outputType, quality);
        const approxSize = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          data: compressedDataUrl,
          size: approxSize,
          type: outputType,
        });
      };
      img.onerror = () => {
        resolve({ data: e.target.result, size: file.size, type: file.type });
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve({ data: null, size: 0, type: file.type });
    };
    reader.readAsDataURL(file);
  });
}
