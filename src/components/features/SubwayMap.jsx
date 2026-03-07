import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSearchPlus, FaSearchMinus, FaCompressArrowsAlt } from 'react-icons/fa';

import jrWestMap from '../../assets/maps/jr_west.png';
import osakaMetroMap from '../../assets/maps/osaka_metro.png';

const maps = {
    jr: {
        title: 'JR 西日本路線圖',
        src: jrWestMap
    },
    metro: {
        title: 'Osaka Metro 路線圖',
        src: osakaMetroMap
    }
};

export default function SubwayMap() {
    const { type } = useParams();
    const navigate = useNavigate();
    const mapData = maps[type];

    // Viewer State
    const [viewerState, setViewerState] = useState({ scale: 1, x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [initialScale, setInitialScale] = useState(1);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const touchState = useRef({
        lastDistance: 0,
        lastFocalX: 0,
        lastFocalY: 0,
        isPinching: false,
        isPanning: false,
        lastX: 0,
        lastY: 0
    });

    const clampOffset = useCallback((x, y, currentScale, cw, ch, iw, ih) => {
        if (!cw || !iw) return { x, y };

        const scaledW = iw * currentScale;
        const scaledH = ih * currentScale;

        let maxX = 0;
        if (scaledW > cw) {
            maxX = (scaledW - cw) / 2;
        }
        let clampedX = Math.min(Math.max(x, -maxX), maxX);

        let maxY = 0;
        if (scaledH > ch) {
            maxY = (scaledH - ch) / 2;
        }
        let clampedY = Math.min(Math.max(y, -maxY), maxY);

        return { x: clampedX, y: clampedY };
    }, []);

    const resetMap = useCallback((containerW, containerH, imgW, imgH) => {
        if (!containerW || !containerH || !imgW || !imgH) return;

        // 計算圖片寬度與容器同寬的比例 (解決最小尺寸會出現黑邊的問題)
        const fitScale = containerW / imgW;

        setInitialScale(fitScale);
        setViewerState({ scale: fitScale, x: 0, y: 0 });
    }, []);

    const handleZoom = useCallback((factor, focalX = null, focalY = null) => {
        setViewerState(prev => {
            const newScale = Math.min(Math.max(prev.scale * factor, initialScale), 6); // Max 6x zoom
            const scaleRatio = newScale / prev.scale;

            let newX = prev.x;
            let newY = prev.y;

            if (scaleRatio !== 1) {
                let fc_x = 0;
                let fc_y = 0;
                if (focalX !== null && focalY !== null && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    fc_x = focalX - (rect.left + rect.width / 2);
                    fc_y = focalY - (rect.top + rect.height / 2);
                }
                newX = prev.x + (fc_x - prev.x) * (1 - scaleRatio);
                newY = prev.y + (fc_y - prev.y) * (1 - scaleRatio);
            }

            const clamped = clampOffset(newX, newY, newScale, containerSize.width, containerSize.height, imageSize.width, imageSize.height);
            return { scale: newScale, x: clamped.x, y: clamped.y };
        });
    }, [initialScale, containerSize, imageSize, clampOffset]);

    // Update container size on mount/resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const cw = containerRef.current.clientWidth;
                const ch = containerRef.current.clientHeight;
                setContainerSize({ width: cw, height: ch });

                if (imageSize.width > 0) {
                    resetMap(cw, ch, imageSize.width, imageSize.height);
                }
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [imageSize.width, imageSize.height, resetMap]);

    const handleImageLoad = (e) => {
        const nw = e.target.naturalWidth;
        const nh = e.target.naturalHeight;
        setImageSize({ width: nw, height: nh });

        if (containerSize.width > 0) {
            resetMap(containerSize.width, containerSize.height, nw, nh);
        }
    };

    // Gesture Handlers
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            touchState.current.isPinching = true;
            touchState.current.isPanning = false;
            touchState.current.lastDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchState.current.lastFocalX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            touchState.current.lastFocalY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        } else if (e.touches.length === 1) {
            touchState.current.isPanning = true;
            touchState.current.isPinching = false;
            touchState.current.lastX = e.touches[0].clientX;
            touchState.current.lastY = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (touchState.current.isPinching && e.touches.length === 2) {
            e.preventDefault(); // Prevent default scroll
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const focalX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const focalY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            if (touchState.current.lastDistance > 0) {
                const deltaScale = dist / touchState.current.lastDistance;
                const dx = focalX - touchState.current.lastFocalX;
                const dy = focalY - touchState.current.lastFocalY;

                setViewerState(prev => {
                    const newScale = Math.min(Math.max(prev.scale * deltaScale, initialScale), 6);
                    const scaleRatio = newScale / prev.scale;

                    let newX = prev.x;
                    let newY = prev.y;

                    // 1. Zoom towards focal point
                    if (scaleRatio !== 1 && containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const fc_x = focalX - (rect.left + rect.width / 2);
                        const fc_y = focalY - (rect.top + rect.height / 2);
                        newX = newX + (fc_x - newX) * (1 - scaleRatio);
                        newY = newY + (fc_y - newY) * (1 - scaleRatio);
                    }

                    // 2. Add pan offset
                    newX += dx;
                    newY += dy;

                    const clamped = clampOffset(newX, newY, newScale, containerSize.width, containerSize.height, imageSize.width, imageSize.height);
                    return { scale: newScale, x: clamped.x, y: clamped.y };
                });
            }

            touchState.current.lastDistance = dist;
            touchState.current.lastFocalX = focalX;
            touchState.current.lastFocalY = focalY;

        } else if (touchState.current.isPanning && e.touches.length === 1) {
            const dx = e.touches[0].clientX - touchState.current.lastX;
            const dy = e.touches[0].clientY - touchState.current.lastY;

            setViewerState(prev => {
                const clamped = clampOffset(prev.x + dx, prev.y + dy, prev.scale, containerSize.width, containerSize.height, imageSize.width, imageSize.height);
                return { ...prev, x: clamped.x, y: clamped.y };
            });

            touchState.current.lastX = e.touches[0].clientX;
            touchState.current.lastY = e.touches[0].clientY;
        }
    };

    const handleTouchEnd = () => {
        touchState.current.isPinching = false;
        touchState.current.isPanning = false;
    };

    if (!mapData) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <h2>找不到路線圖</h2>
                <button onClick={() => navigate('/info')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>
                    返回資訊頁面
                </button>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#111',
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '600px',
            zIndex: 2000,
            overflow: 'hidden',
            touchAction: 'none'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'white',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/info')} style={{ padding: '8px', display: 'flex' }}><FaArrowLeft size={20} /></button>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>{mapData.title}</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleZoom(1.2)} style={{ padding: '8px', color: 'var(--accent-color)' }}><FaSearchPlus size={20} /></button>
                    <button onClick={() => handleZoom(1 / 1.2)} style={{ padding: '8px', color: 'var(--accent-color)' }}><FaSearchMinus size={20} /></button>
                    <button onClick={() => resetMap(containerSize.width, containerSize.height, imageSize.width, imageSize.height)} style={{ padding: '8px', color: 'var(--text-secondary)' }}><FaCompressArrowsAlt size={20} /></button>
                </div>
            </div>

            {/* Map Canvas */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: viewerState.scale > initialScale ? 'grab' : 'default'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    ref={imgRef}
                    src={mapData.src}
                    alt={mapData.title}
                    onLoad={handleImageLoad}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transformOrigin: '0 0',
                        transform: `translate(${viewerState.x}px, ${viewerState.y}px) scale(${viewerState.scale}) translate(-50%, -50%)`,
                        maxWidth: 'none',
                        opacity: imageSize.width > 0 ? 1 : 0,
                        transition: touchState.current.isPinching || touchState.current.isPanning ? 'none' : 'transform 0.1s ease-out, opacity 0.2s ease-in'
                    }}
                />
            </div>

            {/* Instruction Overlay */}
            {viewerState.scale <= initialScale && viewerState.x === 0 && viewerState.y === 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    pointerEvents: 'none',
                    zIndex: 150
                }}>
                    兩指開合縮放，單指平移地圖
                </div>
            )}
        </div>
    );
}
