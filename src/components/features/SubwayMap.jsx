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

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [initialScale, setInitialScale] = useState(1);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const touchState = useRef({
        lastDistance: 0,
        lastX: 0,
        lastY: 0,
        isPinching: false,
        isPanning: false
    });

    const resetMap = useCallback((containerW, containerH, imgW, imgH) => {
        if (!containerW || !containerH || !imgW || !imgH) return;

        // 計算全圖顯示的初始比例
        const sX = containerW / imgW;
        const sY = containerH / imgH;
        const fitScale = Math.min(sX, sY, 1);

        setInitialScale(fitScale);
        setScale(fitScale);
        setOffset({ x: 0, y: 0 });
    }, []);

    // Update container size on mount/resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const cw = containerRef.current.clientWidth;
                const ch = containerRef.current.clientHeight;
                setContainerSize({ width: cw, height: ch });

                // 如果已經有圖片大小，則重新計算縮放
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
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            touchState.current.lastDistance = dist;
        } else if (e.touches.length === 1) {
            touchState.current.isPanning = true;
            touchState.current.isPinching = false;
            touchState.current.lastX = e.touches[0].pageX;
            touchState.current.lastY = e.touches[0].pageY;
        }
    };

    const handleTouchMove = (e) => {
        if (touchState.current.isPinching && e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const delta = dist / touchState.current.lastDistance;
            setScale(prev => Math.min(Math.max(prev * delta, initialScale * 0.5), 5));
            touchState.current.lastDistance = dist;
        } else if (touchState.current.isPanning && e.touches.length === 1) {
            const dx = e.touches[0].pageX - touchState.current.lastX;
            const dy = e.touches[0].pageY - touchState.current.lastY;
            setOffset(prev => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
            touchState.current.lastX = e.touches[0].pageX;
            touchState.current.lastY = e.touches[0].pageY;
        }
    };

    const handleTouchEnd = () => {
        touchState.current.isPinching = false;
        touchState.current.isPanning = false;
    };

    // Mini-map calculations
    const MINI_MAP_WIDTH = 120;
    const miniMapScale = imageSize.width ? MINI_MAP_WIDTH / imageSize.width : 0;
    const miniMapHeight = imageSize.height * miniMapScale;

    // Viewport relative to image coordinates
    const visibleWidth = containerSize.width / scale;
    const visibleHeight = containerSize.height / scale;

    // centerX/Y index into original image coordinates
    const centerX = (containerSize.width / 2 - offset.x) / scale;
    const centerY = (containerSize.height / 2 - offset.y) / scale;

    const viewportRect = {
        left: (centerX - visibleWidth / 2) * miniMapScale,
        top: (centerY - visibleHeight / 2) * miniMapScale,
        width: visibleWidth * miniMapScale,
        height: visibleHeight * miniMapScale
    };

    // Unified pointer interaction for MiniMap (Android/iOS)
    const handleMiniMapPointer = (e) => {
        if (e.buttons !== 1 && e.type !== 'pointerdown') return;

        const miniMapRect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - miniMapRect.left;
        const clickY = e.clientY - miniMapRect.top;

        const targetImageX = clickX / miniMapScale;
        const targetImageY = clickY / miniMapScale;

        setOffset({
            x: containerSize.width / 2 - targetImageX * scale,
            y: containerSize.height / 2 - targetImageY * scale
        });
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
                    <button onClick={() => setScale(prev => Math.min(prev + 0.5, 5))} style={{ padding: '8px', color: 'var(--accent-color)' }}><FaSearchPlus size={20} /></button>
                    <button onClick={() => setScale(prev => Math.max(prev - 0.5, initialScale * 0.5))} style={{ padding: '8px', color: 'var(--accent-color)' }}><FaSearchMinus size={20} /></button>
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
                    cursor: scale > initialScale ? 'grab' : 'default'
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
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) translate(-50%, -50%)`,
                        maxWidth: 'none',
                        transition: touchState.current.isPinching || touchState.current.isPanning ? 'none' : 'transform 0.2s ease-out'
                    }}
                />
            </div>

            {/* Mini Map */}
            <div
                onPointerDown={handleMiniMapPointer}
                onPointerMove={handleMiniMapPointer}
                style={{
                    position: 'absolute',
                    bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                    right: '16px',
                    width: MINI_MAP_WIDTH,
                    height: miniMapHeight,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    backgroundImage: `url(${mapData.src})`,
                    backgroundSize: 'cover',
                    zIndex: 200,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    touchAction: 'none'
                }}
            >
                {/* Viewport Indicator */}
                <div style={{
                    position: 'absolute',
                    border: '1px solid var(--accent-color)',
                    backgroundColor: 'rgba(231, 111, 81, 0.2)',
                    left: viewportRect.left,
                    top: viewportRect.top,
                    width: viewportRect.width,
                    height: viewportRect.height,
                    pointerEvents: 'none',
                    transition: touchState.current.isPinching || touchState.current.isPanning ? 'none' : 'all 0.1s linear'
                }} />
            </div>

            {/* Instruction Overlay */}
            {scale <= initialScale && offset.x === 0 && offset.y === 0 && (
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
