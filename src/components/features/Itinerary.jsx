import React, { useState, useEffect } from 'react';
import { FaPlus, FaCloudSun, FaCloudRain, FaSun, FaMapMarkerAlt, FaMap, FaInfoCircle, FaTicketAlt, FaClock, FaTimes, FaExternalLinkAlt, FaStickyNote, FaEdit } from 'react-icons/fa';
import { addMinutes, format, parse } from 'date-fns';
import { SortableEventItem } from './SortableEventItem';
import { useGlobal } from '../../contexts/GlobalContext';
import { subscribeToItineraries, addItineraryEvent, updateItineraryEvent, deleteItineraryEvent } from '../../services/db';

// Time calculation helpers
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
    // Handle wrap-around for next day (basic support)
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function Itinerary() {
    const { tripDates } = useGlobal();
    const dates = tripDates || [];

    // Current time tracking for progress bar
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // 初始化時就立刻嘗試配對「今天」
    const [selectedDate, setSelectedDate] = useState(() => {
        if (!dates || dates.length === 0) return null;
        const todayStr = format(new Date(), 'MM/dd');
        const matchDate = dates.find(d => d.startsWith(todayStr));
        return matchDate || dates[0];
    });

    useEffect(() => {
        if (dates.length > 0) {
            // 如果目前沒有選取的日期，或是原本選的日期已經被刪除了，重新配對
            if (!selectedDate || !dates.includes(selectedDate)) {
                const todayStr = format(new Date(), 'MM/dd');
                const matchDate = dates.find(d => d.startsWith(todayStr));
                setSelectedDate(matchDate || dates[0]);
            }
        }
    }, [dates, selectedDate]);
    // 拿掉天氣模擬的 state
    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', desc: '', location: '', bookingInfo: '', notes: '', duration: 60, startTime: '09:00', endTime: '10:00', type: 'activity', extraInfo: {} });
    const [overlapWarning, setOverlapWarning] = useState(false);
    const [events, setEvents] = useState([]);

    // 訂閱 Firestore 行程資料
    useEffect(() => {
        const unsubscribe = subscribeToItineraries((data) => {
            setEvents(data);
        });
        return () => unsubscribe();
    }, []);

    // Recalculate times based on order and duration
    // It respects explicit start times if they are later than the calculated sequential time (creating gaps)
    const calculateTimes = (currentEvents) => {
        if (currentEvents.length === 0) return currentEvents;

        let currentTime = parse(currentEvents[0].startTime || '09:00', 'HH:mm', new Date());

        return currentEvents.map((event, index) => {
            // If the user explicitly set a start time that's LATER than the rolling current time, respect it
            if (index > 0 && event.startTime) {
                const explicitTime = parse(event.startTime, 'HH:mm', new Date());
                if (explicitTime > currentTime) {
                    currentTime = explicitTime;
                }
            }

            const startTimeStr = format(currentTime, 'HH:mm');
            currentTime = addMinutes(currentTime, event.duration);
            const endTimeStr = format(currentTime, 'HH:mm');
            return { ...event, time: startTimeStr, endTime: endTimeStr };
        });
    };

    // Filter events for the selected date
    const currentDayEvents = events.filter(e => e.date === selectedDate);

    // Derived state for display
    const displayedEvents = calculateTimes(currentDayEvents);

    const handleDelete = async (id) => {
        // Optimistic UI update
        setEvents(events.filter(event => event.id !== id));
        // DB update
        await deleteItineraryEvent(id);
    };

    // --- TIME SYNC HANDLERS ---
    const handleStartTimeChange = (newStartTime) => {
        setOverlapWarning(false);
        const startMins = timeToMinutes(newStartTime);
        const durationMins = parseInt(newEvent.duration) || 0;
        const newEndTime = minutesToTime(startMins + durationMins);
        setNewEvent({ ...newEvent, startTime: newStartTime, endTime: newEndTime });
    };

    const handleEndTimeChange = (newEndTime) => {
        setOverlapWarning(false);
        const startMins = timeToMinutes(newEvent.startTime);
        let endMins = timeToMinutes(newEndTime);

        // Handle case where end time is on the next day
        if (endMins < startMins) {
            endMins += 24 * 60;
        }

        const newDuration = Math.max(0, endMins - startMins);
        setNewEvent({ ...newEvent, endTime: newEndTime, duration: newDuration });
    };

    const handleDurationChange = (newDurationStr) => {
        setOverlapWarning(false);
        const newDuration = parseInt(newDurationStr) || 0;
        const startMins = timeToMinutes(newEvent.startTime);
        const newEndTime = minutesToTime(startMins + newDuration);
        setNewEvent({ ...newEvent, duration: newDuration, endTime: newEndTime });
    };

    const openAddModal = () => {
        setOverlapWarning(false);
        // Calculate default start time based on the last event of the selected date
        const dayEvents = displayedEvents.filter(e => e.date === selectedDate);
        let defaultStartTime = '09:00';
        if (dayEvents.length > 0) {
            defaultStartTime = dayEvents[dayEvents.length - 1].endTime;
        }

        const defaultDuration = 60;
        const startMins = timeToMinutes(defaultStartTime);
        const defaultEndTime = minutesToTime(startMins + defaultDuration);

        setNewEvent({
            title: '', desc: '', location: '', bookingInfo: '', notes: '',
            duration: defaultDuration,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            type: 'activity', extraInfo: {}
        });
        setShowAddModal(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newEvent.title) return;

        const isEditing = !!newEvent.id;
        const submittedEvent = { ...newEvent }; // Keep a copy for processing

        // Prepare existing events for sorting based on their displayed chronologic time
        let itemsToSort = displayedEvents.filter(ev => ev.date === selectedDate);
        if (isEditing) {
            itemsToSort = itemsToSort.filter(ev => ev.id !== submittedEvent.id);
        }

        // ---- OVERLAP DETECTION ----
        const newStart = timeToMinutes(submittedEvent.startTime || '09:00');
        const newEnd = newStart + (parseInt(submittedEvent.duration) || 60);
        let hasOverlap = false;

        for (const ev of itemsToSort) {
            const evStart = timeToMinutes(ev.time || ev.startTime || '09:00');
            const evEnd = timeToMinutes(ev.endTime || minutesToTime(evStart + ev.duration));

            // Check strict overlap (touching edges like 10:00-11:00 and 11:00-12:00 is fine)
            if (newStart < evEnd && newEnd > evStart) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap && !overlapWarning) {
            setOverlapWarning(true);
            return; // 停留在表單，並顯示警告
        }
        // ---- END OVERLAP DETECTION ----

        // Reset and close right away for UX
        setNewEvent({ title: '', desc: '', location: '', bookingInfo: '', notes: '', duration: 60, startTime: '09:00', endTime: '10:00', type: 'activity', extraInfo: {} });
        setOverlapWarning(false);
        setShowAddModal(false);

        // We use the computed `time` for existing items to sort them sequentially
        const sortableItems = itemsToSort.map(item => ({
            ...item,
            sortingTime: item.time || item.startTime || '09:00'
        }));

        // Insert the new/edited one using its explicitly requested startTime
        sortableItems.push({
            ...submittedEvent,
            id: isEditing ? submittedEvent.id : 'NEW_ITEM_TEMP',
            sortingTime: submittedEvent.startTime || '09:00'
        });

        // Sort all items for the day chronologically
        sortableItems.sort((a, b) => timeToMinutes(a.sortingTime) - timeToMinutes(b.sortingTime));

        // Prepare bulk update promises to fix the order index in db 
        const updatePromises = [];
        let newOrderForTargetItem = 0;

        for (let i = 0; i < sortableItems.length; i++) {
            const item = sortableItems[i];

            if (item.id === 'NEW_ITEM_TEMP' || item.id === submittedEvent.id) {
                newOrderForTargetItem = i;
            } else {
                if (item.order !== i) {
                    updatePromises.push(updateItineraryEvent(item.id, { order: i }));
                }
            }
        }

        // Construct final data for target item
        const finalEventData = {
            date: selectedDate,
            title: submittedEvent.title,
            desc: submittedEvent.desc || '',
            location: submittedEvent.location || '',
            bookingInfo: submittedEvent.bookingInfo || '',
            notes: submittedEvent.notes || '',
            duration: parseInt(submittedEvent.duration) || 60,
            type: submittedEvent.type,
            extraInfo: submittedEvent.extraInfo,
            startTime: submittedEvent.startTime || '',
            order: newOrderForTargetItem
        };

        if (isEditing) {
            updatePromises.push(updateItineraryEvent(submittedEvent.id, finalEventData));
        } else {
            updatePromises.push(addItineraryEvent(finalEventData));
        }

        await Promise.all(updatePromises);
    };

    // 強制全部顯示為晴天
    const getWeatherIcon = (date) => {
        return <FaSun color="#f5a623" />;
    };

    return (
        <div className="page-container">
            <h1 className="page-title">2026日本關西五日遊</h1>

            {/* Scrollable Date Menu */}
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '12px',
                paddingBottom: '16px',
                marginBottom: '16px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-color, white)',
                zIndex: 100,
                paddingTop: '8px',
                marginTop: '-8px'
            }}>
                {dates.map(date => (
                    <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: selectedDate === date ? 'var(--accent-color)' : 'white',
                            color: selectedDate === date ? 'white' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: selectedDate === date ? 'var(--shadow-md)' : 'none'
                        }}
                    >
                        {getWeatherIcon(date)} {date}
                    </button>
                ))}
            </div>


            {/* Timeline View */}
            <div style={{ position: 'relative', padding: '0 8px', maxWidth: '100%', boxSizing: 'border-box' }}>
                {displayedEvents.map((event) => (
                    <SortableEventItem
                        key={event.id}
                        id={event.id}
                        event={event}
                        onDelete={handleDelete}
                        onClickDetail={() => setSelectedEventDetails(event)}
                        currentTime={currentTime}
                        isToday={selectedDate?.startsWith(format(new Date(), 'MM/dd'))}
                    />
                ))}
            </div>

            {/* Floating Add Action Button - Placed above the calculator */}
            <button
                onClick={openAddModal}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 20px + 56px + 16px)', // Navigator height + safety margin + calculator height + space between
                    left: '50%',
                    transform: 'translateX(calc(min(300px, 50vw) - 20px - 56px))',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#F6AD55', // 杏黃色
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 1000,
                    transition: 'transform 0.2s'
                }}>
                <FaPlus size={24} />
            </button>

            {/* Event Details Modal */}
            {selectedEventDetails && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} onClick={() => setSelectedEventDetails(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: 'var(--radius-lg)',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setOverlapWarning(false);
                                    setNewEvent({
                                        ...selectedEventDetails,
                                        startTime: selectedEventDetails.time || '09:00',
                                        endTime: selectedEventDetails.endTime || '10:00'
                                    });
                                    setSelectedEventDetails(null);
                                    setShowAddModal(true);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                            >
                                <FaEdit size={18} />
                            </button>
                            <button
                                onClick={() => setSelectedEventDetails(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '8px', color: 'var(--accent-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaClock /> {selectedEventDetails.time} - {selectedEventDetails.endTime} (約 {selectedEventDetails.duration} 分)
                        </div>
                        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-primary)' }}>{selectedEventDetails.title}</h2>

                        {(selectedEventDetails.desc || selectedEventDetails.notes) && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    <FaStickyNote color="var(--accent-color)" /> 注意事項 / 備註
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {selectedEventDetails.notes || selectedEventDetails.desc}
                                </p>
                            </div>
                        )}

                        {selectedEventDetails.bookingInfo && (
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>
                                    <FaTicketAlt color="#3182CE" /> 訂位 / 票券資訊
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {selectedEventDetails.bookingInfo}
                                </p>
                            </div>
                        )}

                        {selectedEventDetails.location && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    <FaMapMarkerAlt color="#E53E3E" /> 地點資訊
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#EBF8FF' }}>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEventDetails.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            color: '#3182CE', width: '100%',
                                            textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem'
                                        }}
                                    >
                                        <FaMap /> 開啟 Google Maps 導航
                                    </a>

                                </div>
                            </div>
                        )}

                        {/* Extra Info for Flight/Transport specific to details */}
                        {(selectedEventDetails.type === 'transport' || selectedEventDetails.type === 'flight') && selectedEventDetails.extraInfo && (
                            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: `2px dashed ${selectedEventDetails.type === 'flight' ? '#805AD5' : '#3182CE'}` }}>
                                {selectedEventDetails.type === 'transport' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>路線</div><strong>{selectedEventDetails.extraInfo.route || '---'}</strong></div>
                                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>座位</div><strong>{selectedEventDetails.extraInfo.seat || '---'}</strong></div>
                                    </div>
                                )}
                                {selectedEventDetails.type === 'flight' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>航班</div><strong>{selectedEventDetails.extraInfo.flightNo || '---'}</strong></div>
                                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.8rem', color: '#64748b' }}>航廈與登機門</div><strong>{selectedEventDetails.extraInfo.terminal || '---'}</strong></div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                            <button onClick={() => setSelectedEventDetails(null)} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '24px', fontWeight: 'bold', flex: 1, border: 'none', cursor: 'pointer' }}>
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Event Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} onClick={() => setShowAddModal(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: 'var(--radius-lg)',
                        width: '90%',
                        maxWidth: '400px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>{newEvent.id ? '編輯行程' : '新增行程'}</h2>

                        <form onSubmit={handleAddSubmit}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    標題 *
                                </label>
                                <input
                                    type="text"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    分類
                                </label>
                                <select
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value, extraInfo: {} })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '8px' }}
                                >
                                    <option value="activity">景點</option>
                                    <option value="food">用餐</option>
                                    <option value="transport">交通</option>
                                    <option value="flight">航班</option>
                                    <option value="accommodation">住宿</option>
                                </select>
                            </div>

                            {/* Additional Categories info */}
                            {newEvent.type === 'transport' && (
                                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>路線資訊</label>
                                    <input type="text" placeholder="例如：東京車站 ➔ 京都車站" value={newEvent.extraInfo?.route || ''} onChange={e => setNewEvent({ ...newEvent, extraInfo: { ...newEvent.extraInfo, route: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '8px' }} />
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>車位/車廂資訊</label>
                                    <input type="text" placeholder="例如：第 5 車廂 12A" value={newEvent.extraInfo?.seat || ''} onChange={e => setNewEvent({ ...newEvent, extraInfo: { ...newEvent.extraInfo, seat: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                                </div>
                            )}

                            {newEvent.type === 'flight' && (
                                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>航班號碼</label>
                                    <input type="text" placeholder="例如：JL802" value={newEvent.extraInfo?.flightNo || ''} onChange={e => setNewEvent({ ...newEvent, extraInfo: { ...newEvent.extraInfo, flightNo: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '8px' }} />
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>航廈與登機門</label>
                                    <input type="text" placeholder="例如：T2 登機門 8" value={newEvent.extraInfo?.terminal || ''} onChange={e => setNewEvent({ ...newEvent, extraInfo: { ...newEvent.extraInfo, terminal: e.target.value } })} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                                </div>
                            )}

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    地點
                                </label>
                                <input
                                    type="text"
                                    placeholder="填寫後可於行程詳情快速導航"
                                    value={newEvent.location}
                                    onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    訂位資訊
                                </label>
                                <input
                                    type="text"
                                    placeholder="例如：訂位序號、機票號碼"
                                    value={newEvent.bookingInfo}
                                    onChange={e => setNewEvent({ ...newEvent, bookingInfo: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 30%' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                        開始時間
                                    </label>
                                    <input
                                        type="time"
                                        value={newEvent.startTime || ''}
                                        onChange={e => handleStartTimeChange(e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    />
                                </div>
                                <div style={{ flex: '1 1 30%' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                        結束時間
                                    </label>
                                    <input
                                        type="time"
                                        value={newEvent.endTime || ''}
                                        onChange={e => handleEndTimeChange(e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    />
                                </div>
                                <div style={{ flex: '1 1 30%' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                        停留時間 (分) *
                                    </label>
                                    <input
                                        type="number"
                                        value={newEvent.duration}
                                        onChange={e => handleDurationChange(e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    注意事項與備註
                                </label>
                                <textarea
                                    value={newEvent.notes}
                                    onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    style={{ width: '100%', minHeight: '60px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', resize: 'vertical' }}
                                    placeholder="填寫補充事項..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px' }}>
                                {overlapWarning && (
                                    <span style={{ color: '#E53E3E', fontSize: '0.85rem', flex: 1, fontWeight: 'bold' }}>
                                        時間與現有行程重疊，點擊確認將後方行程順延。
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setOverlapWarning(false); }}
                                    style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: overlapWarning ? '#E53E3E' : 'var(--accent-color)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {overlapWarning ? '確認加入並順延' : '儲存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
