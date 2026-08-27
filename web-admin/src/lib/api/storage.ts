import imageCompression from "browser-image-compression";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import type { ArticleImage } from "@/lib/types";

export const MAX_ARTICLE_IMAGES = 5;

/** Article images are public and immutable; matrimony photos are neither. */
const ARTICLE_CACHE = "public, max-age=31536000, immutable";
const PRIVATE_CACHE = "private, max-age=3600";

/**
 * Compression happens in the browser before the byte ever leaves the desk.
 * Editors paste 6MB phone photos; the app is read on 3G in the hills. 1600px
 * on the long edge at ~0.35MB is the sweet spot for a full-width article image.
 *
 * JPEG rather than WebP. Not for size — `maxSizeMB` binds first, so both land
 * at the same weight and WebP would in fact look slightly better for it. The
 * reason is that every canvas can encode JPEG, while WebP encoding is not
 * guaranteed; when it is missing the compressor throws, and the fallback below
 * then has to ship the original uncompressed bytes. A guaranteed 350KB JPEG
 * beats an occasional 3MB PNG on a hill connection.
 */
const COMPRESSION = {
  maxSizeMB: 0.35,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

/**
 * Compresses, and never gives up on the upload because of it.
 *
 * `browser-image-compression` spins up a Web Worker from a blob URL, which is
 * the kind of thing a bundler or a Content-Security-Policy quietly refuses. It
 * also needs the browser to be able to encode the requested type. Either
 * failure used to throw straight out of the upload, and the seeder's `catch`
 * turned that into a silent "0 images" — the document was written with an empty
 * `images` array and nothing said why.
 *
 * A slightly larger file is a much better outcome than no file, so this falls
 * back down the chain: worker, then no worker, then the original bytes.
 */
async function compressForUpload(file: File): Promise<Blob> {
  try {
    return await imageCompression(file, COMPRESSION);
  } catch {
    try {
      return await imageCompression(file, { ...COMPRESSION, useWebWorker: false });
    } catch {
      // Uncompressed. The Storage rule still caps it at 2MB, and the caller
      // surfaces that as a real error rather than a silent skip.
      return file;
    }
  }
}

/**
 * Runs one upload, retrying when Storage refuses it under load.
 *
 * Every write to `articles/**` is gated by `canWriteArticles()`, which reads
 * the caller's role out of Firestore from inside the Storage rule. That
 * cross-service lookup is rate limited, and the seeder is the one thing in this
 * project that fires forty-five uploads back to back: the first batch goes
 * through and the rest come back `storage/unauthorized`, which reads exactly
 * like a permissions problem and is not one.
 *
 * Backing off costs a few seconds on an action somebody runs once, and it is a
 * far better answer than relaxing the rule so the desk's role no longer has to
 * be checked.
 */
const UPLOAD_ATTEMPTS = 4;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function uploadWithRetry(
  storageRef: ReturnType<typeof ref>,
  blob: Blob,
  metadata: { contentType: string; cacheControl: string },
  onProgress?: (percent: number) => void,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const task = uploadBytesResumable(storageRef, blob, metadata);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => {
            if (!onProgress) return;
            onProgress(
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            );
          },
          reject,
          () => resolve(),
        );
      });
      return;
    } catch (error) {
      if (attempt >= UPLOAD_ATTEMPTS) throw error;
      // 400ms, 800ms, 1600ms — enough for the rules-evaluation budget to
      // refill without making the seeder feel hung.
      await wait(400 * 2 ** (attempt - 1));
    }
  }
}

async function readDimensions(file: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadArticleImage(
  file: File,
  articleKey: string,
  onProgress?: (percent: number) => void,
): Promise<ArticleImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const compressed = await compressForUpload(file);
  const { width, height } = await readDimensions(compressed);

  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `articles/${articleKey}/${name}`;
  const storageRef = ref(storage, path);

  await uploadWithRetry(
    storageRef,
    compressed,
    {
      // Whatever survived compression. Claiming JPEG over PNG bytes would give
      // decoders a reason to reject a perfectly good file.
      contentType: compressed.type || "image/jpeg",
      cacheControl: ARTICLE_CACHE,
    },
    onProgress,
  );

  const url = await getDownloadURL(storageRef);
  return { url, path, width, height, caption: "" };
}

export async function deleteArticleImage(image: ArticleImage): Promise<void> {
  try {
    await deleteObject(ref(storage, image.path));
  } catch {
    // A missing object is not worth blocking the editor over.
  }
}

/**
 * Matrimony photos go to their own bucket path.
 *
 * Article images are world-readable; these must not be. The Storage rule on
 * `matrimony/{uid}/**` requires a signed-in caller and restricts writes to the
 * owner.
 *
 * One honest caveat: `getDownloadURL` returns a tokenised URL that bypasses
 * Storage rules for anyone holding it. The protection that actually matters is
 * therefore that restricted photo URLs live in the private Firestore
 * subcollection and are never sent to a browser that has not earned them.
 */
export async function uploadMatrimonyPhoto(
  file: File,
  uid: string,
  onProgress?: (percent: number) => void,
): Promise<ArticleImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const compressed = await compressForUpload(file);
  const { width, height } = await readDimensions(compressed);

  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `matrimony/${uid}/${name}`;
  const storageRef = ref(storage, path);

  await uploadWithRetry(
    storageRef,
    compressed,
    {
      // Whatever survived compression. Claiming JPEG over PNG bytes would give
      // decoders a reason to reject a perfectly good file.
      contentType: compressed.type || "image/jpeg",
      cacheControl: PRIVATE_CACHE,
    },
    onProgress,
  );

  return { url: await getDownloadURL(storageRef), path, width, height, caption: "" };
}
