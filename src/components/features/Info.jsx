import React, { useState } from 'react';
import { FaExchangeAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { useGlobal } from '../../contexts/GlobalContext';

export default function Info() {
    const { exchangeRate, setExchangeRate, tripDates, generateTripDates } = useGlobal();

    const [showRateModal, setShowRateModal] = useState(false);
    const [tempRate, setTempRate] = useState('');

    const [showDateModal, setShowDateModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [daysCount, setDaysCount] = useState(tripDates.length.toString());

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
        </div>
    );
}
