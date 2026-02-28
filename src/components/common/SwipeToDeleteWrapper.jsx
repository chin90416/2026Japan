import React, { useState, useRef, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';

export function SwipeToDeleteWrapper({ children, onDelete, itemName = '此項目' }) {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);
    const containerRef = useRef(null);
    const hasDragged = useRef(false);
    const [containerWidth, setContainerWidth] = useState(300);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
    }, [children]);

    const deleteThreshold = -(containerWidth / 3);

    // Touch handlers for swipe to delete
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setStartX(e.touches[0].clientX);
            setIsSwiping(true);
            hasDragged.current = false;
        }
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const diff = e.touches[0].clientX - startX;
        if (Math.abs(diff) > 5) {
            hasDragged.current = true;
        }
        if (diff < 0) {
            setSwipeOffset(Math.max(diff, -containerWidth));
        } else {
            setSwipeOffset(0);
        }
    };

    const handleMouseDown = (e) => {
        setStartX(e.clientX);
        setIsSwiping(true);
        hasDragged.current = false;
    };

    const handleMouseMove = (e) => {
        if (!isSwiping) return;
        const diff = e.clientX - startX;
        if (Math.abs(diff) > 5) {
            hasDragged.current = true;
        }
        if (diff < 0) {
            setSwipeOffset(Math.max(diff, -containerWidth));
        } else {
            setSwipeOffset(0);
        }
    };

    const handleSwipeEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        if (swipeOffset <= deleteThreshold) {
            // Trigger confirmation
            if (window.confirm(`確定要刪除 "${itemName}" 嗎？`)) {
                onDelete();
            }
        }
        // Reset position smoothly
        setSwipeOffset(0);
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', marginBottom: '12px', borderRadius: 'var(--radius-md)' }}>
            {/* Background Delete Action - Revealed on swipe */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                backgroundColor: `rgba(220, 38, 38, ${Math.min(1, Math.abs(swipeOffset) / Math.abs(deleteThreshold))})`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '20px',
                color: 'white',
                zIndex: 0,
                transition: isSwiping ? 'none' : 'background-color 0.2s'
            }}>
                <FaTrash
                    size={20}
                    style={{
                        transform: `scale(${Math.min(1.2, 0.8 + Math.abs(swipeOffset) / 100)})`,
                        transition: isSwiping ? 'none' : 'transform 0.2s',
                        opacity: Math.min(1, Math.abs(swipeOffset) / 40)
                    }}
                />
            </div>

            {/* Actual Content Wrapper */}
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleSwipeEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleSwipeEnd}
                onMouseLeave={handleSwipeEnd}
                style={{
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    // Prevent text selection while dragging mouse
                    userSelect: isSwiping ? 'none' : 'auto'
                }}
            >
                {/* 為了防止內部的 onClick 被滑動誤觸，套用透明 overlay (如果需要可加，這裡先倚賴 children 自行處理或使用 capture 攔截) */}
                <div onClickCapture={(e) => {
                    if (hasDragged.current || Math.abs(swipeOffset) > 5) {
                        e.stopPropagation();
                    }
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
