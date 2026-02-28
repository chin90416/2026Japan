import React, { useState, useEffect } from 'react';
import { FaPlus, FaCloudSun, FaCloudRain, FaSun, FaMapMarkerAlt, FaMap, FaInfoCircle, FaTicketAlt, FaClock, FaTimes, FaExternalLinkAlt, FaStickyNote } from 'react-icons/fa';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { addMinutes, format, parse } from 'date-fns';
import { SortableEventItem } from './SortableEventItem';
import { useGlobal } from '../../contexts/GlobalContext';
import { subscribeToItineraries, addItineraryEvent, updateItineraryEvent, deleteItineraryEvent } from '../../services/db';

export default function Itinerary() {
    const { tripDates } = useGlobal();
    const dates = tripDates || [];
    const [selectedDate, setSelectedDate] = useState(dates[0]);

    useEffect(() => {
        if (dates.length > 0) {
            // 如果所選日期還在清單內，且不是初始情況，就不用亂跳
            if (selectedDate && dates.includes(selectedDate)) {
                return;
            }

            // 嘗試偵測系統今天日期 (MM/dd) 是否在行程內
            const todayStr = format(new Date(), 'MM/dd');
            const matchDate = dates.find(d => d.startsWith(todayStr));

            if (matchDate) {
                setSelectedDate(matchDate);
            } else {
                setSelectedDate(dates[0]);
            }
        }
    }, [dates]);
    // 拿掉天氣模擬的 state
    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', desc: '', location: '', bookingInfo: '', notes: '', duration: 60, type: 'activity', extraInfo: {} });
    const [events, setEvents] = useState([]);

    // 訂閱 Firestore 行程資料
    useEffect(() => {
        const unsubscribe = subscribeToItineraries((data) => {
            setEvents(data);
        });
        return () => unsubscribe();
    }, []);

    // Recalculate times based on order and duration
    // The first item always keeps its fixed start time, others follow sequentially
    const calculateTimes = (currentEvents) => {
        if (currentEvents.length === 0) return currentEvents;

        let currentTime = parse(currentEvents[0].startTime || '09:00', 'HH:mm', new Date());

        return currentEvents.map((event, index) => {
            if (index === 0) {
                // First event fixes the time
                currentTime = addMinutes(currentTime, event.duration);
                return { ...event, time: event.startTime || '09:00' };
            } else {
                const formattedTime = format(currentTime, 'HH:mm');
                currentTime = addMinutes(currentTime, event.duration);
                return { ...event, time: formattedTime };
            }
        });
    };

    // Filter events for the selected date
    const currentDayEvents = events.filter(e => e.date === selectedDate);

    // Derived state for display
    const displayedEvents = calculateTimes(currentDayEvents);

    // DND Sensors Configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                // Must hold for 1 seconds (1000ms) to trigger drag
                delay: 1000,
                tolerance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 1000, // 1s long press on mobile
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const dayItems = events.filter(e => e.date === selectedDate);
            const oldIndex = dayItems.findIndex(item => item.id === active.id);
            const newIndex = dayItems.findIndex(item => item.id === over.id);
            const newDayItems = arrayMove(dayItems, oldIndex, newIndex);

            // Optimistic UI update
            const otherItems = events.filter(e => e.date !== selectedDate);
            setEvents([...otherItems, ...newDayItems]);

            // Sync order to Firestore
            for (let i = 0; i < newDayItems.length; i++) {
                await updateItineraryEvent(newDayItems[i].id, { order: i });
            }
        }
    };

    const handleDelete = async (id) => {
        // Optimistic UI update
        setEvents(events.filter(event => event.id !== id));
        // DB update
        await deleteItineraryEvent(id);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newEvent.title) return;

        const eventData = {
            date: selectedDate,
            title: newEvent.title,
            desc: newEvent.desc || '',
            location: newEvent.location || '',
            bookingInfo: newEvent.bookingInfo || '',
            notes: newEvent.notes || '',
            duration: parseInt(newEvent.duration) || 60,
            type: newEvent.type,
            extraInfo: newEvent.extraInfo,
            startTime: '', // Time will be auto-calculated since it's added at the end
            order: events.filter(ev => ev.date === selectedDate).length // Put at the end
        };

        // Reset and close right away for UX
        setNewEvent({ title: '', desc: '', location: '', bookingInfo: '', notes: '', duration: 60, type: 'activity', extraInfo: {} });
        setShowAddModal(false);

        // Add to Firestore
        await addItineraryEvent(eventData);
    };

    // 強制全部顯示為晴天
    const getWeatherIcon = (date) => {
        return <FaSun color="#f5a623" />;
    };

    return (
        <div className="page-container">
            <h1 className="page-title">旅程表</h1>

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


            {/* Timeline View inside DnD Context */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={displayedEvents.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                        {/* Vertical Line */}
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            bottom: '0',
                            left: '26px',
                            width: '2px',
                            backgroundColor: 'var(--border-color)',
                            zIndex: 0
                        }} />

                        {displayedEvents.map((event) => (
                            <SortableEventItem
                                key={event.id}
                                id={event.id}
                                event={event}
                                onDelete={handleDelete}
                                onClickDetail={() => setSelectedEventDetails(event)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Floating Add Action Button - Placed above the calculator */}
            <button
                onClick={() => setShowAddModal(true)}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height) + 20px + 56px + 16px)', // Navigator height + safety margin + calculator height + space between
                    right: '20px',
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
                        <button
                            onClick={() => setSelectedEventDetails(null)}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <FaTimes size={20} />
                        </button>

                        <div style={{ marginBottom: '8px', color: 'var(--accent-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaClock /> {selectedEventDetails.time} (約 {selectedEventDetails.duration} 分)
                        </div>
                        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-primary)' }}>{selectedEventDetails.title}</h2>

                        {(selectedEventDetails.desc || selectedEventDetails.notes) && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    <FaStickyNote color="var(--accent-color)" /> 注意事項 / 備註
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    {selectedEventDetails.notes || selectedEventDetails.desc}
                                </p>
                            </div>
                        )}

                        {selectedEventDetails.bookingInfo && (
                            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>
                                    <FaTicketAlt color="#4299E1" /> 訂位 / 票券資訊
                                </div>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {selectedEventDetails.bookingInfo}
                                </p>
                            </div>
                        )}

                        {selectedEventDetails.location && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    <FaMapMarkerAlt color="#F56565" /> 地點資訊
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', flex: 1 }}>{selectedEventDetails.location}</span>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEventDetails.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: '#EBF8FF', color: '#3182CE',
                                            padding: '8px 12px', borderRadius: '20px',
                                            textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0
                                        }}
                                    >
                                        <FaMap /> 導航
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Extra Info for Flight/Transport specific to details */}
                        {(selectedEventDetails.type === 'transport' || selectedEventDetails.type === 'flight') && selectedEventDetails.extraInfo && (
                            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: `2px dashed ${selectedEventDetails.type === 'flight' ? '#F56565' : '#4299E1'}` }}>
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
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>新增行程</h2>

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

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    停留時間 (分) *
                                </label>
                                <input
                                    type="number"
                                    value={newEvent.duration}
                                    onChange={e => setNewEvent({ ...newEvent, duration: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    min="1"
                                    required
                                />
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

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--accent-color)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
