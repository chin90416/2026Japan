import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';

// 這裡我們預設圖檔會被放在 src/assets/maps/
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
    const [isZoomed, setIsZoomed] = useState(false);
    const mapData = maps[type];

    if (!mapData) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <h2>找不到路線圖</h2>
                <button
                    onClick={() => navigate('/info')}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        backgroundColor: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontWeight: 'bold'
                    }}
                >
                    返回資訊頁面
                </button>
            </div>
        );
    }

    const toggleZoom = () => setIsZoomed(!isZoomed);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a1a', // 深色背景更能襯托地圖
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '600px',
            zIndex: 2000
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'white',
                borderBottom: '1px solid var(--border-color)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/info')}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <FaArrowLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{mapData.title}</h2>
                </div>

                <button
                    onClick={toggleZoom}
                    style={{
                        backgroundColor: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {isZoomed ? <><FaSearchMinus /> 縮小</> : <><FaSearchPlus /> 放大</>}
                </button>
            </div>

            {/* Map Viewer Container */}
            <div
                style={{
                    flex: 1,
                    overflow: isZoomed ? 'auto' : 'hidden',
                    display: 'flex',
                    alignItems: isZoomed ? 'flex-start' : 'center',
                    justifyContent: isZoomed ? 'flex-start' : 'center',
                    backgroundColor: '#1a1a1a',
                    WebkitOverflowScrolling: 'touch',
                    cursor: isZoomed ? 'grab' : 'zoom-in'
                }}
                onClick={() => !isZoomed && setIsZoomed(true)}
            >
                <img
                    src={mapData.src}
                    alt={mapData.title}
                    style={isZoomed ? {
                        maxWidth: 'none',
                        display: 'block',
                        cursor: 'zoom-out'
                    } : {
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: 'block'
                    }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        const errorMsg = document.createElement('div');
                        errorMsg.style.padding = '40px 20px';
                        errorMsg.style.textAlign = 'center';
                        errorMsg.style.color = '#fff';
                        errorMsg.innerHTML = `
                            <p style="font-weight: bold; font-size: 1.1rem; color: #ff8080;">⚠️ 無法載入圖檔</p>
                            <p style="font-size: 0.9rem; color: #ccc; margin-top: 8px;">
                                請確認 <b>src/assets/maps/${type === 'jr' ? 'jr_west.png' : 'osaka_metro.png'}</b> 是否已放置正確的圖檔。
                            </p>
                        `;
                        parent.appendChild(errorMsg);
                    }}
                />
            </div>

            {/* 提示訊息 */}
            {!isZoomed && (
                <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontSize: '0.9rem',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 20
                }}>
                    點擊地圖或按鈕放大查看細節
                </div>
            )}
        </div>
    );
}
