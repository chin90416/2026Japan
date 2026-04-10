import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FaCheck, FaTimes } from 'react-icons/fa';

// 輔助函式：根據裁切區域擷取畫布並產出檔案
const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 為避免手機等裝置繪製超過 3000px 的超大畫布導致記憶體崩潰 (OOM) 產生空白 Blob，限制輸出最高解析度為 800px
    const MAX_DIMENSION = 800;
    const scale = Math.min(1, MAX_DIMENSION / pixelCrop.width, MAX_DIMENSION / pixelCrop.height);

    const destWidth = pixelCrop.width * scale;
    const destHeight = pixelCrop.height * scale;
    
    canvas.width = destWidth;
    canvas.height = destHeight;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        destWidth,
        destHeight
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            // 直接回傳 Blob 即可供 Firebase 上傳使用，避免部份 Android 裝置 new File() 失敗產生空檔
            blob.name = 'cropped.jpg';
            resolve(blob);
        }, 'image/jpeg', 0.92);
    });
};

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsSaving(true);
        try {
            const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImageFile, URL.createObjectURL(croppedImageFile)); // 回傳 File 和預覽 URL
        } catch (e) {
            console.error(e);
            alert("處理圖片時發生錯誤。");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'black', zIndex: 3000,
            display: 'flex', flexDirection: 'column'
        }}>
            {/* 標題與操作列 */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white'
            }}>
                <button
                    onClick={onCancel}
                    style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', padding: '8px' }}
                >
                    <FaTimes />
                </button>
                <div style={{ fontWeight: 'bold' }}>調整圖片 (1:1)</div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ background: 'none', border: 'none', color: '#F6AD55', fontSize: '1.2rem', padding: '8px', opacity: isSaving ? 0.5 : 1 }}
                >
                    <FaCheck />
                </button>
            </div>

            {/* 裁切視窗區 */}
            <div style={{ position: 'relative', flex: 1, width: '100%', backgroundColor: '#333' }}>
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1} // 強制 1:1 正方形
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    onZoomChange={setZoom}
                    objectFit="contain" // 讓正方形圖片可以滿版顯示不強制撐滿高寬
                />
            </div>

            {/* 縮放滑桿列 */}
            <div style={{
                padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', display: 'flex', alignItems: 'center', gap: '16px'
            }}>
                <span style={{ fontSize: '12px' }}>縮小</span>
                <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(e.target.value)}
                    style={{ flex: 1, accentColor: '#F6AD55' }}
                />
                <span style={{ fontSize: '12px' }}>放大</span>
            </div>
        </div>
    );
}
