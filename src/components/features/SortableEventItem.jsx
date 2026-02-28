import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaTrash, FaTrain, FaPlane, FaUtensils, FaCamera, FaBed } from 'react-icons/fa';

export function SortableEventItem({ id, event, onDelete, onClickDetail }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    // Local state for swipe to delete
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);
    const cardRef = useRef(null);
    const hasDragged = useRef(false);
    const [cardWidth, setCardWidth] = useState(300); // 預設寬度

    useEffect(() => {
        if (cardRef.current) {
            setCardWidth(cardRef.current.offsetWidth);
        }
    }, []);

    // 刪除閾值設定為卡片寬度的 1/3
    const deleteThreshold = -(cardWidth / 3);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || (isSwiping ? 'none' : 'transform 0.2s'),
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 99 : 1,
        display: 'flex',
    };

    // Touch handlers for swipe to delete (Independent of DnD Kit which handles long-press drag)
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
            setSwipeOffset(Math.max(diff, -cardWidth));
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
            setSwipeOffset(Math.max(diff, -cardWidth));
        } else {
            setSwipeOffset(0);
        }
    };

    const handleSwipeEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        if (swipeOffset <= deleteThreshold) {
            // Trigger confirmation
            if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
                onDelete(id);
            }
        }
        // Reset position smoothly
        setSwipeOffset(0);
    };

    const handleClick = (e) => {
        // Prevent click if we just swiped left or right
        if (hasDragged.current) {
            // Reset for next click
            hasDragged.current = false;
            return;
        }
        if (Math.abs(swipeOffset) > 5) return;
        if (onClickDetail) {
            onClickDetail();
        }
    };

    return (
        <div style={{ marginBottom: '24px' }}>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                // Spread the sortable listeners here. 
                // We use DndContext with delay so quick taps/swipes won't trigger drag.
                {...listeners}
            >
                {/* Timeline Node */}
                <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    border: '3px solid var(--accent-color)',
                    marginTop: '4px',
                    marginRight: '16px',
                    flexShrink: 0
                }} />

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Background Delete Action - Revealed on swipe */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%', // 滿寬度，字靠右
                        // 動態計算背景顏色，越往左拉越紅
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
                                transform: `scale(${Math.min(1.2, 0.8 + Math.abs(swipeOffset) / 100)})`, // 垃圾桶隨滑動放大
                                transition: isSwiping ? 'none' : 'transform 0.2s',
                                opacity: Math.min(1, Math.abs(swipeOffset) / 40) // 剛滑動時浮現
                            }}
                        />
                    </div>

                    {/* Actual Event Card Content */}
                    <div
                        ref={cardRef}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleSwipeEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleSwipeEnd}
                        onMouseLeave={handleSwipeEnd}
                        onClick={handleClick}
                        style={{
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-sm)',
                            borderLeft: event.type === 'flight' ? '4px solid #805AD5' :
                                event.type === 'transport' ? '4px solid #3182CE' :
                                    event.type === 'food' ? '4px solid #38A169' :
                                        event.type === 'accommodation' ? '4px solid #D53F8C' :
                                            '4px solid var(--accent-color)',
                            transform: `translateX(${swipeOffset}px)`,
                            transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
                            position: 'relative',
                            zIndex: 1,
                            width: '100%',
                            cursor: 'grab', // Indicate draggable
                            backgroundImage: (event.type === 'flight' || event.type === 'transport')
                                ? 'radial-gradient(circle at 100% 50%, transparent 6px, white 7px)' // Ticket hole effect
                                : 'none',
                        }}
                    >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {event.type === 'flight' && <FaPlane color="#805AD5" />}
                                {event.type === 'transport' && <FaTrain color="#3182CE" />}
                                {event.type === 'food' && <FaUtensils color="#38A169" />}
                                {(event.type === 'activity' || !event.type) && <FaCamera color="var(--accent-color)" />}
                                {event.type === 'accommodation' && <FaBed color="#D53F8C" />}
                                <span style={{ color: 'var(--text-primary)' }}>{event.time}</span>
                            </div>
                            <span>{event.duration} min</span>
                        </div>

                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{event.title}</h3>

                        {/* Custom Ticket / Boarding Pass Visuals */}
                        {(event.type === 'transport' || event.type === 'flight') && event.extraInfo ? (
                            <div style={{
                                marginTop: '12px',
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '4px',
                                border: '1px dashed #cbd5e1',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                {event.type === 'transport' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>路線 (Route)</span>
                                            <strong style={{ fontSize: '0.9rem', color: '#334155' }}>{event.extraInfo.route || '---'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>座位 (Seat)</span>
                                            <strong style={{ fontSize: '0.9rem', color: '#334155' }}>{event.extraInfo.seat || '---'}</strong>
                                        </div>
                                    </>
                                )}
                                {event.type === 'flight' && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>航班 (Flight)</span>
                                            <strong style={{ fontSize: '0.9rem', color: '#334155', letterSpacing: '1px' }}>{event.extraInfo.flightNo || '---'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>航廈 / 登機口 (Gate)</span>
                                            <strong style={{ fontSize: '0.9rem', color: '#334155' }}>{event.extraInfo.terminal || '---'}</strong>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : null}

                        {event.desc && <p style={{ margin: (event.type === 'transport' || event.type === 'flight') ? '8px 0 0 0' : 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{event.desc}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
