import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";
import imageCompression from "browser-image-compression";

/**
 * 壓縮並上傳圖片到 Firebase Storage
 * @param {File} imageFile 已經裁切好的原始檔案
 * @param {string} storagePath Firebase Storage 的路徑 (例如: souvenirs/img_12345.jpg)
 * @returns {Promise<string>} 上傳成功後回傳的下載 URL
 */
export const uploadImage = async (imageFile, storagePath) => {
    try {
        // 設定圖片壓縮選項
        const options = {
            maxSizeMB: 0.2, // 最大 200KB
            maxWidthOrHeight: 800, // 最大寬度或高度 800px (網格顯示很夠用了)
            useWebWorker: true,
            fileType: "image/webp" // 轉為 WebP 格式以獲得更好的壓縮率
        };

        // 進行壓縮
        let compressedFile = imageFile;
        try {
            compressedFile = await imageCompression(imageFile, options);
            console.log(`Original: ${(imageFile.size / 1024).toFixed(2)} KB -> Compressed: ${(compressedFile.size / 1024).toFixed(2)} KB`);
        } catch (error) {
            console.warn("壓縮圖片失敗，將上傳原圖:", error);
        }

        // 建立 Storage 參照
        const storageRef = ref(storage, storagePath);

        // 設定檔案 Metadata
        const metadata = {
            contentType: compressedFile.type || "image/webp",
        };

        // 執行上傳
        const snapshot = await uploadBytes(storageRef, compressedFile, metadata);

        // 取得下載網址
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error) {
        console.error("上傳圖片至 Firebase 發生錯誤:", error);
        throw error;
    }
};

/**
 * 從 Firebase Storage 刪除圖片
 * @param {string} imageUrl Firebase Storage 的下載網址
 */
export const deleteImage = async (imageUrl) => {
    try {
        if (!imageUrl) return;

        // 從下載網址解析出 Storage Ref
        const imageRef = ref(storage, imageUrl);

        await deleteObject(imageRef);
        console.log("成功從 Firebase Storage 刪除圖片:", imageUrl);
    } catch (error) {
        // 如果錯誤是因為找不到檔案，可以忽略
        if (error.code === 'storage/object-not-found') {
            console.warn("在 Firebase Storage 找不到該圖片，可能已被刪除:", imageUrl);
        } else {
            console.error("從 Firebase Storage 刪除圖片發生錯誤:", error);
        }
    }
};
