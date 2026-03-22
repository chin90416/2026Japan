import React, { useState } from 'react';
import { FaExchangeAlt, FaCalendarAlt, FaTimes, FaFileExport, FaDownload, FaUserEdit } from 'react-icons/fa';
import { useGlobal } from '../../contexts/GlobalContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { getAllItineraries, getAllExpenses } from '../../services/db';

export default function Info() {
    const { exchangeRate, setExchangeRate, tripDates, generateTripDates, userProfiles, updateUserProfile } = useGlobal();
    const { currentUser } = useAuth();

    const [showRateModal, setShowRateModal] = useState(false);
    const [tempRate, setTempRate] = useState('');

    const [showDateModal, setShowDateModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [daysCount, setDaysCount] = useState(tripDates.length.toString());

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [tempDisplayName, setTempDisplayName] = useState('');

    const handleSaveProfile = async () => {
        if (!currentUser?.email) return;
        if (tempDisplayName.trim() === '') return;
        await updateUserProfile(currentUser.email, tempDisplayName.trim());
        setShowProfileModal(false);
    };

    const handleSaveRate = () => {
        const rate = parseFloat(tempRate);
        if (!isNaN(rate) && rate > 0) {
            setExchangeRate(rate);
            setShowRateModal(false);
        }
    };

    const handleSaveDate = () => {
        const count = parseInt(daysCount, 10);
        if (startDate && count > 0) {
            generateTripDates(startDate, count);
            setShowDateModal(false);
        }
    };

    const formatDateForFilename = () => {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    };

    const handleExportItinerary = async () => {
        try {
            const data = await getAllItineraries();
            if (data.length === 0) {
                alert('沒有可匯出的行程資料');
                return;
            }

            const headers = ['日期(Date)', '時間(Time)', '標題(Title)', '類型(Type)', '停留時間(Duration)', '地點(Location)', '訂位資訊(Booking)', '備註(Notes)'];
            let csvContent = '\uFEFF' + headers.join(',') + '\n';

            data.forEach(item => {
                const date = item.date || '';
                const time = item.time || item.startTime || '';
                const title = `"${(item.title || '').replace(/"/g, '""')}"`;
                const type = item.type || '';
                const duration = item.duration || '';
                const location = `"${(item.location || '').replace(/"/g, '""')}"`;
                const booking = `"${(item.bookingInfo || '').replace(/"/g, '""')}"`;
                const notesContent = [item.desc, item.notes].filter(Boolean).join(' / ');
                const notes = `"${notesContent.replace(/"/g, '""')}"`;

                csvContent += `${date},${time},${title},${type},${duration},${location},${booking},${notes}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Itinerary_Export_${formatDateForFilename()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('匯出行程失敗', err);
            alert('匯出行程發生錯誤！');
        }
    };

    const handleExportExpenses = async () => {
        try {
            const data = await getAllExpenses();
            if (data.length === 0) {
                alert('沒有可匯出的記帳資料');
                return;
            }

            const headers = ['日期(Date)', '項目名稱(Name)', '分類(Category)', '幣別(Currency)', '金額(Amount)'];
            let csvContent = '\uFEFF' + headers.join(',') + '\n';

            data.forEach(item => {
                const date = item.date || '';
                const name = `"${(item.name || '').replace(/"/g, '""')}"`;
                const category = item.category || '';
                const currency = item.currency || '';
                const amount = item.amount || 0;

                csvContent += `${date},${name},${category},${currency},${amount}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Expenses_Export_${formatDateForFilename()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('匯出記帳失敗', err);
            alert('匯出記帳發生錯誤！');
        }
    };

    return (
        <div className="page-container" style={{ paddingBottom: '100px' }}>
            <h1 className="page-title">資訊</h1>

            {/* 蛋奶素素食翻譯圖卡 */}
            <div style={{
                backgroundColor: '#FFF5F0', // 柔和的蜜桃膚色背景
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                marginTop: '16px'
            }}>
                {/* Badge 勳章 */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{
                        backgroundColor: '#D97777', // 柔和的磚紅色
                        color: 'white',
                        padding: '6px 20px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        letterSpacing: '2px'
                    }}>
                        蛋奶素
                    </span>
                </div>

                {/* Japanese Text (主要給店員看，字體大且對比明顯) */}
                <p style={{
                    fontSize: '1.15rem',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                    fontWeight: 'bold',
                    color: '#2C5282', // 深藍色
                    textAlign: 'justify'
                }}>
                    私はベジタリアンですので、肉、魚介類（かつおだしやかつおが入ってる醤油など）、五葷（にら、玉ねぎ、ねぎ、ラッキョウとにんにく）やアルコールがすべて食べられないんです。上記の食材は抜きで、何か料理をお作りいただけますか？
                </p>

                {/* Chinese Text (輔助使用者確認) */}
                <p style={{
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                    color: '#2D3748', // 深灰色
                    textAlign: 'justify'
                }}>
                    因為我是素食者，肉、海鮮類（鰹魚汁或含有鰹魚的醬油等）、五葷（韭菜、洋蔥、蔥、野韭、蒜頭）與酒全部都不能吃。是否可以提供沒有以上食材的料理呢？
                </p>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginTop: '12px'
                }}>
                    <span style={{ fontSize: '2rem', transform: 'rotate(15deg)' }}>🍳</span>
                </div>
            </div>

            {/* 路線圖按鈕區塊 */}
            <div style={{ marginTop: '32px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>交通路線圖</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={() => window.location.hash = '/map/jr'}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            padding: '20px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer',
                            gap: '12px'
                        }}
                    >
                        <div style={{
                            backgroundColor: '#E6FFFA',
                            color: '#319795',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}>
                            JR
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>JR 西日本</span>
                    </button>

                    <button
                        onClick={() => window.location.hash = '/map/metro'}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            padding: '20px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer',
                            gap: '12px'
                        }}
                    >
                        <div style={{
                            backgroundColor: '#FFF5F5',
                            color: '#E53E3E',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}>
                            M
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Osaka Metro</span>
                    </button>
                </div>
            </div>

            {/* 系統設定間隔與標題 */}
            <div style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '2px dashed var(--border-color)'
            }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>系統設定</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 匯率設定按鈕 */}
                    <button
                        onClick={() => {
                            setTempRate(exchangeRate.toString());
                            setShowRateModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ backgroundColor: '#EBF4FF', padding: '10px', borderRadius: '50%', color: '#3182CE' }}>
                                <FaExchangeAlt size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>換算匯率</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>當前：1 JPY = {exchangeRate} TWD</div>
                            </div>
                        </div>
                    </button>

                    {/* 出遊日期設定按鈕 */}
                    <button
                        onClick={() => {
                            setStartDate('');
                            setDaysCount(tripDates.length.toString());
                            setShowDateModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ backgroundColor: '#EDF2F7', padding: '10px', borderRadius: '50%', color: '#4A5568' }}>
                                <FaCalendarAlt size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>出遊日期與天數</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>共 {tripDates.length} 天行程</div>
                            </div>
                        </div>
                    </button>

                    {/* 顯示名稱設定按鈕 */}
                    <button
                        onClick={() => {
                            setTempDisplayName(userProfiles[currentUser?.email] || '');
                            setShowProfileModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ backgroundColor: '#F0FFF4', padding: '10px', borderRadius: '50%', color: '#38A169' }}>
                                <FaUserEdit size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>自訂顯示名稱</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    當前顯示：{userProfiles[currentUser?.email] || currentUser?.email?.split('@')[0] || '未登入'}
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* 強制重新整理並清除本機快取按鈕 */}
                    <button
                        onClick={async () => {
                            if (window.confirm('確定要強制重新整理並清除本機暫存？這將會重新下載雲端最新資料，並清除所有已快取的圖片與設定。')) {
                                try {
                                    // 清除 localStorage
                                    localStorage.removeItem('cachedExchangeRate');
                                    localStorage.removeItem('cachedTripDates');

                                    // 嘗試清除 Firestore Persistence
                                    await terminate(db).catch(() => { });
                                    await clearIndexedDbPersistence(db).catch(() => { });

                                    // 清除 Service Worker 圖片永久快取 (Cache API)
                                    if ('caches' in window) {
                                        const cacheNames = await window.caches.keys();
                                        await Promise.all(cacheNames.map(name => window.caches.delete(name)));
                                    }

                                    // 重新整理
                                    window.location.reload();
                                } catch (e) {
                                    console.error("Clear cache failed", e);
                                    window.location.reload();
                                }
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FEFCBF', // 黃色警告背景
                            color: '#B7791F', // 深黃色文字
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #F6E05E',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginTop: '8px'
                        }}
                    >
                        強制重新整理與清除本機快取
                    </button>
                </div>
            </div>

            {/* 資料匯出 */}
            <div style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '2px dashed var(--border-color)'
            }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>資料匯出</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={handleExportItinerary}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ backgroundColor: '#E2E8F0', padding: '10px', borderRadius: '50%', color: '#4A5568' }}>
                                <FaFileExport size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>匯出行程 (CSV)</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>下載以便在其他應用程式分析</div>
                            </div>
                        </div>
                        <FaDownload color="var(--text-secondary)" />
                    </button>

                    <button
                        onClick={handleExportExpenses}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ backgroundColor: '#E2E8F0', padding: '10px', borderRadius: '50%', color: '#4A5568' }}>
                                <FaFileExport size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>匯出記帳 (CSV)</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>下載以便在其他應用程式分析</div>
                            </div>
                        </div>
                        <FaDownload color="var(--text-secondary)" />
                    </button>
                </div>
            </div>

            {/* 匯率 Modal */}
            {showRateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowRateModal(false)}>
                    <div style={{
                        backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)',
                        width: '90%', maxWidth: '320px', boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>自訂匯率</h3>
                            <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><FaTimes size={20} /></button>
                        </div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>1 JPY = ? TWD</label>
                        <input
                            type="number" step="0.001"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '20px', fontSize: '1.2rem' }}
                            autoFocus
                        />
                        <button onClick={handleSaveRate} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}>
                            儲存匯率
                        </button>
                    </div>
                </div>
            )}

            {/* 日期 Modal */}
            {showDateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowDateModal(false)}>
                    <div style={{
                        backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)',
                        width: '90%', maxWidth: '320px', boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>設定出遊日期</h3>
                            <button onClick={() => setShowDateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><FaTimes size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>出遊起始日</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>行程天數</label>
                            <input
                                type="number" min="1" max="30"
                                value={daysCount}
                                onChange={(e) => setDaysCount(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>

                        <button onClick={handleSaveDate} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}>
                            產生行程
                        </button>
                    </div>
                </div>
            )}

            {/* 自訂顯示名稱 Modal */}
            {showProfileModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowProfileModal(false)}>
                    <div style={{
                        backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)',
                        width: '90%', maxWidth: '320px', boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>自訂顯示名稱</h3>
                            <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><FaTimes size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                您目前登入的帳號：<br />
                                <strong>{currentUser?.email}</strong>
                            </label>
                            <input
                                type="text"
                                placeholder="例如：爸爸、UserA"
                                value={tempDisplayName}
                                onChange={(e) => setTempDisplayName(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                                autoFocus
                            />
                        </div>

                        <button onClick={handleSaveProfile} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}>
                            儲存名稱
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
