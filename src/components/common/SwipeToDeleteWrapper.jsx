import React, { useState, useRef, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';

export function SwipeToDeleteWrapper({ children, onDelete, itemName = '此項目' }) {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const containerRef = useRef(null);
    const hasDragged = useRef(false);
    const swipeOffsetRef = useRef(0);
    const cleanupRefs = useRef(null);
    const [containerWidth, setContainerWidth] = useState(300);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
        return () => {
            if (cleanupRefs.current) {
                cleanupRefs.current();
            }
        };
    }, [children]);

    const deleteThreshold = -(containerWidth / 3);

    const handlePointerDown = (e) => {
        if (!e.isPrimary) return;

        // Prevent native drag start to avoid conflicts with image dragging, etc.
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
            e.preventDefault();
        }

        const startX = e.clientX;
        setIsSwiping(true);
        hasDragged.current = false;
        swipeOffsetRef.current = 0;

        const handlePointerMove = (moveEvent) => {
            const diff = moveEvent.clientX - startX;
            if (Math.abs(diff) > 5) {
                hasDragged.current = true;
            }
            if (diff < 0) {
                const currentWidth = containerRef.current ? containerRef.current.offsetWidth : containerWidth;
                const newOffset = Math.max(diff, -currentWidth);
                setSwipeOffset(newOffset);
                swipeOffsetRef.current = newOffset;
            } else {
                setSwipeOffset(0);
                swipeOffsetRef.current = 0;
            }
        };

        const handlePointerUp = (upEvent) => {
            setIsSwiping(false);
            if (cleanupRefs.current) {
                cleanupRefs.current();
                cleanupRefs.current = null;
            }

            // Only trigger delete if it was a normal pointer up and not a cancel!
            if (upEvent && upEvent.type !== 'pointercancel') {
                const currentWidth = containerRef.current ? containerRef.current.offsetWidth : containerWidth;
                const threshold = -(currentWidth / 3);

                if (swipeOffsetRef.current <= threshold) {
                    // Delay confirm slightly to let UI render and not block thread aggressively
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            if (window.confirm(`確定要刪除 "${itemName}" 嗎？`)) {
                                onDelete();
                            }
                        }, 10);
                    });
                }
            }

            setSwipeOffset(0);
            swipeOffsetRef.current = 0;
        };

        // Attach global listeners
        // This ensures tracking works even if the mouse leaves the original component boundary!
        const cleanup = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
        cleanupRefs.current = cleanup;

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
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
                onPointerDown={handlePointerDown}
                onDragStart={(e) => e.preventDefault()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    userSelect: isSwiping ? 'none' : 'auto',
                    touchAction: 'pan-y'
                }}
            >
                <div onClickCapture={(e) => {
                    if (hasDragged.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
