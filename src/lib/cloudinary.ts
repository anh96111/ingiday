const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
};

function ensureCloudinaryConfig() {
  if (!cloudName || !uploadPreset) {
    throw new Error("Thiếu cấu hình Cloudinary trong .env.local.");
  }
}

async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Không thể đọc ảnh ${file.name}.`));
    };
    image.src = url;
  });
}

function sourceSize(source: ImageBitmap | HTMLImageElement) {
  return source instanceof ImageBitmap
    ? { width: source.width, height: source.height }
    : { width: source.naturalWidth, height: source.naturalHeight };
}

export async function prepareSquareWebp(file: File, size = 1200, quality = 0.82) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} không phải là file ảnh.`);
  }

  const source = await loadImageSource(file);
  const { width, height } = sourceSize(source);

  if (!width || !height) {
    if (source instanceof ImageBitmap) source.close();
    throw new Error(`Không thể xác định kích thước ảnh ${file.name}.`);
  }

  const cropSize = Math.min(width, height);
  const sx = Math.max(0, (width - cropSize) / 2);
  const sy = Math.max(0, (height - cropSize) / 2);
  const outputSize = Math.min(size, Math.max(1, cropSize));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    if (source instanceof ImageBitmap) source.close();
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

  if (source instanceof ImageBitmap) source.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Không thể tối ưu ảnh."))),
      "image/webp",
      quality,
    );
  });

  const safeBaseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-") || "san-pham";
  return new File([blob], `${safeBaseName}.webp`, { type: "image/webp" });
}

export async function uploadProductImage(file: File): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfig();
  const optimizedFile = await prepareSquareWebp(file);
  const formData = new FormData();
  formData.append("file", optimizedFile);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    bytes?: number;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message || "Không thể tải ảnh lên Cloudinary.");
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width ?? 1200,
    height: payload.height ?? 1200,
    bytes: payload.bytes ?? optimizedFile.size,
  };
}

export function optimizeCloudinaryUrl(url: string, size = 900) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transformation = `f_auto,q_auto,c_fill,g_auto,w_${size},h_${size},dpr_auto`;
  return url.replace("/upload/", `/upload/${transformation}/`);
}
