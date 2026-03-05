import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

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

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8f9fa',
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
                gap: '16px',
                backgroundColor: 'white',
                borderBottom: '1px solid var(--border-color)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
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
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{mapData.title}</h2>
            </div>

            {/* Map Viewer Container */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                padding: '10px',
                WebkitOverflowScrolling: 'touch' // iOS 平滑捲動
            }}>
                <img
                    src={mapData.src}
                    alt={mapData.title}
                    style={{
                        maxWidth: 'none', // 允許圖片超出容器以便捲動查看細節
                        display: 'block'
                    }}
                />
            </div>

            {/* 提示訊息 */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                pointerEvents: 'none'
            }}>
                可自由滑動查看細節
            </div>
        </div>
    );
}
