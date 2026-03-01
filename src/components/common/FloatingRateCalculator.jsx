import React, { useState } from 'react';
import { FaCalculator, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../../contexts/GlobalContext';

export default function FloatingRateCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isJpyToTwd, setIsJpyToTwd] = useState(true); // Default JPY -> TWD
    const navigate = useNavigate();

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
        if (key === 'AC') {
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
        } else if (key === '%') {
            const result = evaluateMath(amount) / 100;
            setAmount(result.toString());
        } else {
            setAmount(prev => prev + key);
        }
    };

    const handleNavigateToExpense = () => {
        // Calculate the base value from the input expression
        const baseValue = evaluateMath(amount);
        const finalAmount = baseValue || 0;

        // Pass the calculated amount and the SELECTED currency
        navigate('/expenses', {
            state: {
                openAddModal: true,
                amount: finalAmount.toString(),
                currency: isJpyToTwd ? 'JPY' : 'TWD'
            }
        });
        setIsOpen(false);
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
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 2000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }} onClick={() => setIsOpen(false)}>
                    <div style={{
                        backgroundColor: '#000000',
                        borderRadius: '32px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '350px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '500' }}>匯率計算機</h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A1A1A6' }}><FaTimes size={24} /></button>
                        </div>

                        {/* Top Section: Result and Rate */}
                        <div style={{ textAlign: 'center', fontSize: '40px', fontWeight: '300', color: 'white', marginBottom: '8px', wordBreak: 'break-all' }}>
                            {result} <span style={{ fontSize: '20px', color: '#A1A1A6' }}>{isJpyToTwd ? 'TWD' : 'JPY'}</span>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '12px', color: '#A1A1A6', padding: '6px', backgroundColor: '#1C1C1E', borderRadius: '12px', marginBottom: '16px' }}>
                            <span style={{ fontWeight: '500' }}>當前匯率：</span> 1 {isJpyToTwd ? 'JPY' : 'TWD'} ≈ {isJpyToTwd ? RATE_JPY_TO_TWD : RATE_TWD_TO_JPY.toFixed(4)} {isJpyToTwd ? 'TWD' : 'JPY'}
                        </div>

                        {/* Input Field */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', color: '#A1A1A6' }}>
                                    輸入金額 ({isJpyToTwd ? '日幣 JPY' : '台幣 TWD'})
                                </label>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    readOnly
                                    value={displayAmount}
                                    style={{
                                        width: '100%',
                                        fontSize: '32px',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        outline: 'none',
                                        backgroundColor: '#1C1C1E',
                                        color: 'white',
                                        textAlign: 'right',
                                        fontWeight: '300'
                                    }}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Currency Switcher */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsJpyToTwd(true)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '16px',
                                    backgroundColor: isJpyToTwd ? '#FF9F0A' : '#333333',
                                    color: isJpyToTwd ? 'white' : '#A1A1A6',
                                    fontWeight: isJpyToTwd ? '600' : '400',
                                    fontSize: '16px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                日幣 JPY
                            </button>
                            <button
                                onClick={() => setIsJpyToTwd(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '16px',
                                    backgroundColor: !isJpyToTwd ? '#FF9F0A' : '#333333',
                                    color: !isJpyToTwd ? 'white' : '#A1A1A6',
                                    fontWeight: !isJpyToTwd ? '600' : '400',
                                    fontSize: '16px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                台幣 TWD
                            </button>
                        </div>

                        {/* iOS Style Custom Keypad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            {['AC', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '記帳', '0', '.', '='].map(btn => (
                                <button
                                    key={btn}
                                    onClick={() => btn === '記帳' ? handleNavigateToExpense() : handleKeypad(btn)}
                                    style={{
                                        position: 'relative',
                                        padding: btn === '記帳' ? '0' : '16px 0',
                                        height: '64px', // Fixed height to make it circular
                                        fontSize: btn === '記帳' ? '18px' : ['AC', '⌫', '%'].includes(btn) ? '24px' : '28px',
                                        fontWeight: btn === '記帳' ? '600' : '400',
                                        backgroundColor: ['÷', '×', '-', '+', '='].includes(btn)
                                            ? '#FF9F0A' // Orange for operators
                                            : ['AC', '⌫', '%'].includes(btn)
                                                ? '#A5A5A5' // Light gray for top row
                                                : '#333333', // Dark gray for numbers and actions
                                        color: ['AC', '⌫', '%'].includes(btn) ? 'black' : 'white',
                                        border: 'none',
                                        borderRadius: '32px', // Fully rounded
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        transition: 'opacity 0.1s'
                                    }}
                                    onMouseDown={(e) => e.currentTarget.style.opacity = '0.7'}
                                    onMouseUp={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
