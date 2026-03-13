import { storage } from './config'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * Upload a single File to Firebase Storage under the given folder path.
 * Returns a promise that resolves to { name, url, size, type, storagePath }
 * onProgress(percent: number) is called during upload.
 */
export function uploadFile(file, folder = 'rfq-attachments', onProgress) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now()
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path      = `${folder}/${timestamp}_${safeName}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        if (onProgress) onProgress(pct)
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({
          name:        file.name,
          url,
          size:        file.size,
          type:        file.type,
          storagePath: path,
        })
      }
    )
  })
}

/**
 * Delete a file from Firebase Storage by its storagePath.
 */
export async function deleteFile(storagePath) {
  if (!storagePath) return
  try {
    await deleteObject(ref(storage, storagePath))
  } catch (err) {
    // Ignore "object not found" errors (already deleted)
    if (err.code !== 'storage/object-not-found') throw err
  }
}
