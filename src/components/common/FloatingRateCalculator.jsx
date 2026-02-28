import React, { useState } from 'react';
import { FaCalculator, FaTimes } from 'react-icons/fa';
import { useGlobal } from '../../contexts/GlobalContext';

export default function FloatingRateCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isJpyToTwd, setIsJpyToTwd] = useState(true); // Default JPY -> TWD

    const { exchangeRate } = useGlobal();
    const RATE_JPY_TO_TWD = exchangeRate;
    const RATE_TWD_TO_JPY = 1 / RATE_JPY_TO_TWD;

    const evaluateMath = (expr) => {
        try {
            const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
            if (!sanitized) return 0;
            // eslint-disable-next-line
            const evaluated = new Function('return ' + sanitized)();
            return isNaN(evaluated) || !isFinite(evaluated) ? 0 : evaluated;
        } catch {
            return 0;
        }
    };

    const handleCalculate = (val) => {
        if (!val) return 0;
        const baseValue = evaluateMath(val);
        const rate = isJpyToTwd ? RATE_JPY_TO_TWD : RATE_TWD_TO_JPY;
        return (baseValue * rate).toFixed(2);
    };

    const handleKeypad = (key) => {
        if (key === 'C') {
            setAmount('');
        } else if (key === '⌫') {
            setAmount(prev => prev.slice(0, -1));
        } else if (key === '=') {
            const result = evaluateMath(amount);
            setAmount(result.toString());
        } else if (key === '÷') {
            setAmount(prev => prev + '/');
        } else if (key === '×') {
            setAmount(prev => prev + '*');
        } else {
            setAmount(prev => prev + key);
        }
    };

    const result = handleCalculate(amount);
    const displayAmount = amount.replace(/\//g, '÷').replace(/\*/g, '×');

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height) + 20px)',
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 1000,
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'scale(0)' : 'scale(1)'
                }}
            >
                <FaCalculator size={24} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }} onClick={() => setIsOpen(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '320px',
                        boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>匯率計算機</h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><FaTimes size={20} /></button>
                        </div>

                        {/* Top Section: Result and Rate */}
                        <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '12px' }}>
                            {result} <span style={{ fontSize: '16px' }}>{isJpyToTwd ? 'TWD' : 'JPY'}</span>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                            <span style={{ fontWeight: 'bold' }}>當前匯率：</span> 1 {isJpyToTwd ? 'JPY' : 'TWD'} ≈ {isJpyToTwd ? RATE_JPY_TO_TWD : RATE_TWD_TO_JPY.toFixed(4)} {isJpyToTwd ? 'TWD' : 'JPY'}
                        </div>

                        {/* Input Field */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                輸入金額 ({isJpyToTwd ? '日幣 JPY' : '台幣 TWD'})
                            </label>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => handleKeypad('⌫')}
                                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', padding: '8px', cursor: 'pointer' }}>
                                    ⌫
                                </button>
                                <input
                                    type="text"
                                    readOnly
                                    value={displayAmount}
                                    style={{ width: '100%', fontSize: '24px', padding: '12px', paddingLeft: '48px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: '#f8fafc', textAlign: 'right' }}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Currency Switcher */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsJpyToTwd(true)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: isJpyToTwd ? 'var(--accent-color)' : '#f0f0f0',
                                    color: isJpyToTwd ? 'white' : 'var(--text-primary)',
                                    fontWeight: isJpyToTwd ? 'bold' : 'normal',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                日幣
                            </button>
                            <button
                                onClick={() => setIsJpyToTwd(false)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: !isJpyToTwd ? 'var(--accent-color)' : '#f0f0f0',
                                    color: !isJpyToTwd ? 'white' : 'var(--text-primary)',
                                    fontWeight: !isJpyToTwd ? 'bold' : 'normal',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                台幣
                            </button>
                        </div>

                        {/* Custom Keypad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '=', '+'].map(btn => (
                                <button
                                    key={btn}
                                    onClick={() => handleKeypad(btn)}
                                    style={{
                                        padding: '12px 0',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        backgroundColor: ['÷', '×', '-', '+', '='].includes(btn) ? '#F6AD55' : btn === 'C' ? '#fee2e2' : 'white',
                                        color: ['÷', '×', '-', '+', '='].includes(btn) ? 'white' : btn === 'C' ? '#ef4444' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {btn}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
