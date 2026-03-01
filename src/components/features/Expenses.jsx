import React, { useState, useEffect } from 'react';
import { FaPlus, FaUtensils, FaTrain, FaBed, FaShoppingBag, FaIcons, FaTimes, FaTicketAlt, FaCalendarAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { SwipeToDeleteWrapper } from '../common/SwipeToDeleteWrapper';
import { useGlobal } from '../../contexts/GlobalContext';
import { subscribeToExpenses, addExpense, deleteExpense, updateExpense } from '../../services/db';

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const location = useLocation();

    const [showAddModal, setShowAddModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '', category: 'food', currency: 'JPY' });

    // 編輯用狀態
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItemId, setEditItemId] = useState(null);
    const [editExpense, setEditExpense] = useState({ name: '', amount: '', category: 'food', currency: 'JPY' });

    // Handle auto-opening Add Modal from calculator
    useEffect(() => {
        if (location.state?.openAddModal) {
            setShowAddModal(true);
            setNewExpense(prev => ({
                ...prev,
                amount: location.state.amount || '',
                currency: location.state.currency || 'JPY'
            }));

            // Clear the state so refreshing doesn't re-open the modal
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // 訂閱 Firestore 記帳紀錄
    useEffect(() => {
        const unsubscribe = subscribeToExpenses((data) => {
            setExpenses(data);
        });
        return () => unsubscribe();
    }, []);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newExpense.name || !newExpense.amount) return;

        const expenseData = {
            name: newExpense.name,
            amount: parseInt(newExpense.amount),
            currency: newExpense.currency,
            category: newExpense.category,
            date: format(new Date(), 'MM/dd')
        };

        setNewExpense({ name: '', amount: '', category: 'food', currency: 'JPY' });
        setShowAddModal(false);

        await addExpense(expenseData);
    };

    const openEditModal = (expense) => {
        setEditItemId(expense.id);
        setEditExpense({
            name: expense.name,
            amount: expense.amount.toString(),
            category: expense.category,
            currency: expense.currency
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editExpense.name || !editExpense.amount) return;

        const updateData = {
            name: editExpense.name,
            amount: parseInt(editExpense.amount),
            currency: editExpense.currency,
            category: editExpense.category
        };

        setShowEditModal(false);

        // Optimistic UI update
        setExpenses(expenses.map(expense =>
            expense.id === editItemId ? { ...expense, ...updateData } : expense
        ));

        // DB update
        await updateExpense(editItemId, updateData);
    };

    const handleDelete = async (id) => {
        // Optimistic UI update
        setExpenses(expenses.filter(expense => expense.id !== id));
        // DB update
        await deleteExpense(id);
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'food': return <FaUtensils color="#f5a623" />;
            case 'transport': return <FaTrain color="#4a90e2" />;
            case 'accommodation': return <FaBed color="#9013fe" />;
            case 'shopping': return <FaShoppingBag color="#e74c3c" />;
            case 'ticket': return <FaTicketAlt color="#48bb78" />;
            default: return <FaIcons color="#7f8c8d" />;
        }
    };

    const { exchangeRate } = useGlobal();
    const RATE_JPY_TO_TWD = exchangeRate;
    const RATE_TWD_TO_JPY = 1 / exchangeRate;

    const totalJpy = Math.round(expenses.reduce((acc, curr) => acc + (curr.currency === 'JPY' ? curr.amount : curr.amount * RATE_TWD_TO_JPY), 0));
    const totalTwd = Math.round(expenses.reduce((acc, curr) => acc + (curr.currency === 'TWD' ? curr.amount : curr.amount * RATE_JPY_TO_TWD), 0));

    // 計算各分類合計 (以 TWD 為基準)
    const categoryColors = {
        food: '#f5a623',
        transport: '#4a90e2',
        accommodation: '#9013fe',
        shopping: '#e74c3c',
        ticket: '#48bb78',
        other: '#7f8c8d'
    };

    const categoryNames = {
        food: '飲食',
        transport: '交通',
        accommodation: '住宿',
        shopping: '購物',
        ticket: '票券',
        other: '其他'
    };

    const categoryTotals = expenses.reduce((acc, curr) => {
        const amountInTwd = curr.currency === 'TWD' ? curr.amount : curr.amount * RATE_JPY_TO_TWD;
        acc[curr.category] = (acc[curr.category] || 0) + amountInTwd;
        return acc;
    }, {});

    // 準備圓餅圖 (Donut Chart) 的 SVG 路徑資料
    // C = 2 * PI * r, r = 15.91549430918954 => C = 100
    let cumulativePercent = 0;
    const chartSegments = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => {
            const percent = totalTwd > 0 ? (amount / totalTwd) * 100 : 0;
            const segment = {
                category,
                amount,
                percent,
                dasharray: `${percent} ${100 - percent}`,
                dashoffset: 100 - cumulativePercent // 從頂部開始，順時針方向
            };
            cumulativePercent += percent;
            return segment;
        });

    return (
        <div className="page-container">
            <h1 className="page-title">記帳</h1>

            {/* Total Balance Card */}
            <div style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #1a1a1a 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '8px' }}>總花費</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    NT$ {totalTwd.toLocaleString()}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.9 }}>
                    ≈ ¥ {totalJpy.toLocaleString()}
                </div>
                {/* Decorative circle */}
                <div style={{
                    position: 'absolute',
                    right: '-20px',
                    bottom: '-40px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%'
                }} />
            </div>

            {/* Category Statistics Chart */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0' }}>開銷分析</h2>

                {expenses.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        {/* Donut Chart SVG */}
                        <div style={{ width: '120px', height: '120px', flexShrink: 0, position: 'relative' }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                {/* Background Circle */}
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />

                                {/* Segments */}
                                {chartSegments.map((segment) => (
                                    <circle
                                        key={segment.category}
                                        cx="18"
                                        cy="18"
                                        r="15.915"
                                        fill="transparent"
                                        stroke={categoryColors[segment.category]}
                                        strokeWidth="4"
                                        strokeDasharray={segment.dasharray}
                                        strokeDashoffset={segment.dashoffset}
                                        style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                                    />
                                ))}
                            </svg>
                            {/* Inner Text */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>項目</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{expenses.length}</span>
                            </div>
                        </div>

                        {/* Legend / Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {chartSegments.slice(0, 4).map((segment) => (
                                <div key={segment.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: categoryColors[segment.category] }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{categoryNames[segment.category] || segment.category}</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        NT$ {Math.round(segment.amount).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {chartSegments.length > 4 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
                                    以及其他 {chartSegments.length - 4} 個分類...
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0' }}>
                        尚無花費紀錄
                    </div>
                )}
            </div>

            {/* Expense List */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>近期紀錄</h2>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>全部</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {Object.entries(
                        expenses.reduce((groups, expense) => {
                            if (!groups[expense.date]) {
                                groups[expense.date] = [];
                            }
                            groups[expense.date].push(expense);
                            return groups;
                        }, {})
                    )
                        // (Optional) Sort dates desc so newest day is on top
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                        .map(([date, dayExpenses]) => (
                            <div key={date}>
                                {/* Date Group Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 'bold',
                                    fontSize: '0.95rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    paddingBottom: '8px'
                                }}>
                                    <FaCalendarAlt color="var(--accent-color)" /> {date}
                                </div>

                                {/* Expenses for this date */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {dayExpenses.map(expense => (
                                        <SwipeToDeleteWrapper
                                            key={expense.id}
                                            onDelete={() => handleDelete(expense.id)}
                                            itemName={expense.name}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '16px',
                                                    backgroundColor: 'white',
                                                    borderRadius: 'var(--radius-md)',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    cursor: 'pointer' // 增加游標提示
                                                }}
                                                onClick={() => openEditModal(expense)}
                                            >
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--bg-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    marginRight: '16px'
                                                }}>
                                                    {getCategoryIcon(expense.category)}
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{expense.name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{expense.category}</div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--danger-color)' }}>
                                                        -{expense.currency === 'JPY' ? '¥' : 'NT$'}{expense.amount.toLocaleString()}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        ≈ {expense.currency === 'JPY' ? 'NT$' : '¥'}{expense.currency === 'JPY' ? Math.round(expense.amount * RATE_JPY_TO_TWD).toLocaleString() : Math.round(expense.amount * RATE_TWD_TO_JPY).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </SwipeToDeleteWrapper>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => setShowAddModal(true)}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height) + 20px + 56px + 16px)', // 統一位於計算機正上方
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#F6AD55', // 杏黃色
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 900,
                    transition: 'transform 0.2s'
                }}>
                <FaPlus size={24} />
            </button>

            {/* Add Expense Modal */}
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
                        boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>新增紀錄</h2>

                        <form onSubmit={handleAddSubmit}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    分類
                                </label>
                                <select
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="food">飲食</option>
                                    <option value="transport">交通</option>
                                    <option value="accommodation">住宿</option>
                                    <option value="shopping">購物</option>
                                    <option value="ticket">票券</option>
                                    <option value="other">其他</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    項目名稱 *
                                </label>
                                <input
                                    type="text"
                                    value={newExpense.name}
                                    onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    幣別與金額 *
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={newExpense.currency}
                                        onChange={e => setNewExpense({ ...newExpense, currency: e.target.value })}
                                        style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="JPY">日幣</option>
                                        <option value="TWD">台幣</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                        required
                                        min="1"
                                        placeholder="輸入金額"
                                    />
                                </div>
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
                                        backgroundColor: '#F6AD55',
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

            {/* Edit Expense Modal */}
            {showEditModal && (
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
                }} onClick={() => setShowEditModal(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: 'var(--radius-lg)',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: 'var(--shadow-md)'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>編輯紀錄</h2>

                        <form onSubmit={handleEditSubmit}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    分類
                                </label>
                                <select
                                    value={editExpense.category}
                                    onChange={e => setEditExpense({ ...editExpense, category: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="food">飲食</option>
                                    <option value="transport">交通</option>
                                    <option value="accommodation">住宿</option>
                                    <option value="shopping">購物</option>
                                    <option value="ticket">票券</option>
                                    <option value="other">其他</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    項目名稱 *
                                </label>
                                <input
                                    type="text"
                                    value={editExpense.name}
                                    onChange={e => setEditExpense({ ...editExpense, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    幣別與金額 *
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={editExpense.currency}
                                        onChange={e => setEditExpense({ ...editExpense, currency: e.target.value })}
                                        style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="JPY">日幣</option>
                                        <option value="TWD">台幣</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={editExpense.amount}
                                        onChange={e => setEditExpense({ ...editExpense, amount: e.target.value })}
                                        style={{ flex: 1, padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                        required
                                        min="1"
                                        placeholder="輸入金額"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#F6AD55',
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
