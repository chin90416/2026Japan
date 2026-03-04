import React, { useState, useRef, useEffect } from 'react';
import { FaTrash, FaTrain, FaPlane, FaUtensils, FaCamera, FaBed } from 'react-icons/fa';

export function SortableEventItem({ id, event, onDelete, onClickDetail, currentTime, isToday }) {

    // Local state for swipe to delete
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [isVerticalScroll, setIsVerticalScroll] = useState(false);
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

    // Time progress logic
    let eventStatus = 'future';
    let progressPct = 0;
    let dotTop = '11px';
    let progressLineHeight = '0px';

    if (isToday && currentTime) {
        // Parse event times assuming today's date
        const todayStr = new Date();
        const startParts = event.time.split(':');
        const endParts = event.endTime.split(':');

        const startTime = new Date(todayStr);
        startTime.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);

        const endTime = new Date(todayStr);
        endTime.setHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0, 0);

        if (currentTime > endTime) {
            eventStatus = 'past';
        } else if (currentTime >= startTime && currentTime <= endTime) {
            eventStatus = 'current';
            const totalDuration = endTime - startTime;
            const elapsed = currentTime - startTime;
            progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            const factor = progressPct / 100;
            // The timeline full span is 100% height + 17px (from top:11px to bottom:-28px)
            progressLineHeight = `calc((100% + 17px) * ${factor})`;
            dotTop = `calc(11px + (100% + 17px) * ${factor})`;
        } else {
            eventStatus = 'future';
        }
    } else if (currentTime && !isToday && event.date) {
        // Simple logic for non-today dates to check if whole day is past
        // (Assuming event.date is something like "MM/dd" and can be compared roughly)
        // For simplicity, if it's not today, we don't show active progress, just past/future.
        const [month, day] = event.date.split('/');
        const eventFullDate = new Date();
        eventFullDate.setMonth(parseInt(month, 10) - 1, parseInt(day, 10));
        eventFullDate.setHours(23, 59, 59, 999);

        if (currentTime > eventFullDate) {
            eventStatus = 'past';
        }
    }

    const style = {
        transition: isSwiping ? 'none' : 'transform 0.2s',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        touchAction: 'pan-y',
    };

    // Touch handlers for swipe to delete (Independent of DnD Kit which handles long-press drag)
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setStartX(e.touches[0].clientX);
            setStartY(e.touches[0].clientY);
            setIsSwiping(true);
            setIsVerticalScroll(false);
            hasDragged.current = false;
        }
    };

    const handleTouchMove = (e) => {
        if (!isSwiping || isVerticalScroll) return;

        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;

        // 如果垂直移動距離大於水平，判定為使用者正在上下捲動畫軸
        if (Math.abs(diffY) > 10 && Math.abs(diffY) > Math.abs(diffX)) {
            setIsVerticalScroll(true);
            return;
        }

        if (Math.abs(diffX) > 5) {
            hasDragged.current = true;
        }
        if (diffX < 0) {
            setSwipeOffset(Math.max(diffX, -cardWidth));
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
            <div style={style} className="sortable-event-item">
                {/* Timeline Container (Node + Vertical Line) */}
                <div style={{
                    position: 'relative',
                    width: '24px', /* Ensure fixed width for timeline area */
                    marginRight: '12px', /* Space between timeline and card */
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Vertical Line spanning the card height */}
                    <div style={{
                        position: 'absolute',
                        top: '11px', // Start below the node roughly
                        bottom: '-28px', // Connect to the next item
                        width: '3px',
                        backgroundColor: eventStatus === 'past' ? 'var(--accent-color)' : 'var(--border-color)', // Completed line vs default line
                        zIndex: 0
                    }} />

                    {/* Progress overlay line for 'current' event */}
                    {eventStatus === 'current' && (
                        <div style={{
                            position: 'absolute',
                            top: '11px',
                            height: progressLineHeight,
                            width: '3px',
                            backgroundColor: 'var(--accent-color)', // Active progress color
                            zIndex: 1
                        }} />
                    )}

                    {/* Timeline Node */}
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: (eventStatus === 'past' || eventStatus === 'current') ? 'var(--accent-color)' : 'white',
                        border: `3px solid ${(eventStatus === 'past' || eventStatus === 'current') ? 'var(--accent-color)' : '#cbd5e1'}`,
                        marginTop: '4px',
                        position: 'relative',
                        zIndex: 2,
                        boxShadow: (eventStatus === 'past' || eventStatus === 'current') ? '0 0 4px rgba(231,111,81,0.4)' : 'none'
                    }} />

                    {/* Blinking Dot for Current Time */}
                    {eventStatus === 'current' && (
                        <div
                            className="blinking-progress-dot"
                            style={{
                                position: 'absolute',
                                top: dotTop,
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#F6AD55', // Sun yellow for current time
                                borderRadius: '50%',
                                boxShadow: '0 0 10px rgba(246, 173, 85, 0.8)',
                                zIndex: 3
                            }} />
                    )}
                </div>

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
                                <span style={{ color: 'var(--text-primary)' }}>{event.time} - {event.endTime}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span>{event.duration} min</span>
                                <div style={{ minWidth: '8px' }}></div>
                            </div>
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

                        {event.notes && <p style={{ margin: (event.type === 'transport' || event.type === 'flight') ? '8px 0 0 0' : 0, color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{event.notes}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
