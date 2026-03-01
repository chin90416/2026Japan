import React, { useState } from 'react';
import { FaCheckCircle, FaRegCircle, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import { SwipeToDeleteWrapper } from '../common/SwipeToDeleteWrapper';
import { subscribeToPackingList, addPackingItem, deletePackingItem, updatePackingItem } from '../../services/db';

export default function Shopping() {
    const [activeTab, setActiveTab] = useState('souvenir');
    const [items, setItems] = useState([]);

    // 訂閱 Firestore 清單紀錄
    React.useEffect(() => {
        const unsubscribe = subscribeToPackingList((data) => {
            setItems(data);
        });
        return () => unsubscribe();
    }, []);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const [newRemarkText, setNewRemarkText] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');

    const [showEditModal, setShowEditModal] = useState(false);
    const [editItemId, setEditItemId] = useState(null);
    const [editItemText, setEditItemText] = useState('');
    const [editItemRemark, setEditItemRemark] = useState('');
    const [editItemQuantity, setEditItemQuantity] = useState('1');
    const [editItemType, setEditItemType] = useState('packing');

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        const itemData = {
            text: newItemText.trim(),
            checked: false,
            type: activeTab
        };

        if (activeTab === 'souvenir') {
            itemData.remark = newRemarkText.trim();
            itemData.quantity = newItemQuantity.toString().trim() || '1';
        }

        setNewItemText('');
        setNewRemarkText('');
        setShowAddModal(false);

        await addPackingItem(itemData);
    };

    const openEditModal = (item) => {
        setEditItemId(item.id);
        setEditItemText(item.text);
        setEditItemRemark(item.remark || '');
        setEditItemType(item.type);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editItemText.trim()) return;

        const updateData = {
            text: editItemText.trim(),
        };

        if (editItemType === 'souvenir') {
            updateData.remark = editItemRemark.trim();
            updateData.quantity = editItemQuantity.toString().trim() || '1';
        }

        setShowEditModal(false);

        // Optimistic UI update
        setItems(items.map(item => item.id === editItemId ? { ...item, ...updateData } : item));

        // DB update
        await updatePackingItem(editItemId, updateData);
    };

    const handleDelete = async (id) => {
        setItems(items.filter(item => item.id !== id)); // Optimistic update
        await deletePackingItem(id);
    };

    const toggleItem = async (id) => {
        const targetItem = items.find(item => item.id === id);
        if (!targetItem) return;

        // Optimistic UI update
        setItems(items.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));

        // DB update
        await updatePackingItem(id, { checked: !targetItem.checked });
    };

    const currentItems = items.filter(item => item.type === activeTab);
    const pendingItems = currentItems.filter(item => !item.checked);
    const completedItems = currentItems.filter(item => item.checked);

    return (
        <div className="page-container">
            <h1 className="page-title">清單</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('packing')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-lg)',
                        fontWeight: 'bold',
                        backgroundColor: activeTab === 'packing' ? 'var(--accent-color)' : 'white',
                        color: activeTab === 'packing' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'packing' ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                    }}
                >
                    行李清單
                </button>
                <button
                    onClick={() => setActiveTab('souvenir')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-lg)',
                        fontWeight: 'bold',
                        backgroundColor: activeTab === 'souvenir' ? 'var(--accent-color)' : 'white',
                        color: activeTab === 'souvenir' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'souvenir' ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                    }}
                >
                    伴手禮
                </button>
            </div>

            {/* Checklist: Pending */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    待完成 ({pendingItems.length})
                </h3>
                {pendingItems.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '12px' }}>
                        目前沒有待完成的項目
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pendingItems.map((item) => (
                            <SwipeToDeleteWrapper
                                key={item.id}
                                onDelete={() => handleDelete(item.id)}
                                itemName={item.text}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    backgroundColor: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div onClick={() => toggleItem(item.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                            <FaRegCircle size={24} color="var(--text-secondary)" />
                                        </div>
                                        <div
                                            style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '4px 0' }}
                                            onClick={() => openEditModal(item)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                                    {item.text}
                                                </span>
                                                {item.type === 'souvenir' && item.quantity && (
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        color: 'white',
                                                        backgroundColor: 'var(--accent-color)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        x{item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            {item.remark && (
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    {item.remark}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SwipeToDeleteWrapper>
                        ))}
                    </div>
                )}
            </div>

            {/* Checklist: Completed */}
            <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    已完成 ({completedItems.length})
                </h3>
                {completedItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {completedItems.map((item) => (
                            <SwipeToDeleteWrapper
                                key={item.id}
                                onDelete={() => handleDelete(item.id)}
                                itemName={item.text}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    backgroundColor: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    opacity: 0.7
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div onClick={() => toggleItem(item.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                            <FaCheckCircle size={24} color="var(--success-color)" />
                                        </div>
                                        <div
                                            style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '4px 0' }}
                                            onClick={() => openEditModal(item)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '1.1rem',
                                                    color: 'var(--text-secondary)',
                                                    textDecoration: 'line-through'
                                                }}>
                                                    {item.text}
                                                </span>
                                                {item.type === 'souvenir' && item.quantity && (
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        color: 'white',
                                                        backgroundColor: 'var(--text-secondary)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: 'bold',
                                                        opacity: 0.8
                                                    }}>
                                                        x{item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            {item.remark && (
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', textDecoration: 'line-through' }}>
                                                    {item.remark}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SwipeToDeleteWrapper>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => {
                    setNewItemText('');
                    setNewRemarkText('');
                    setNewItemQuantity('1');
                    setShowAddModal(true);
                }}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height) + 20px + 56px + 16px)', // 統一位於計算機正上方
                    left: '50%',
                    transform: 'translateX(calc(min(300px, 50vw) - 20px - 56px))', // 置中後往右推 (半扣除右邊界與本身寬度)
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

            {/* Add Item Modal */}
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
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>
                            新增 {activeTab === 'packing' ? '行李' : '伴手禮'} 項目
                        </h2>

                        <form onSubmit={handleAddSubmit}>
                            {activeTab === 'packing' ? (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        寫入項目名稱 *
                                    </label>
                                    <input
                                        type="text"
                                        value={newItemText}
                                        onChange={e => setNewItemText(e.target.value)}
                                        placeholder="例如：護照、行動護照"
                                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                        required
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            寫入項目名稱 *
                                        </label>
                                        <input
                                            type="text"
                                            value={newItemText}
                                            onChange={e => setNewItemText(e.target.value)}
                                            placeholder="例如：護照"
                                            style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            數量
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newItemQuantity}
                                            onChange={e => setNewItemQuantity(e.target.value)}
                                            style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'souvenir' && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        備註
                                    </label>
                                    <input
                                        type="text"
                                        value={newRemarkText}
                                        onChange={e => setNewRemarkText(e.target.value)}
                                        placeholder="例如：數量、購買地點"
                                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                    />
                                </div>
                            )}

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

            {/* Edit Item Modal */}
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
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>
                            編輯 {editItemType === 'packing' ? '行李' : '伴手禮'} 項目
                        </h2>

                        <form onSubmit={handleEditSubmit}>
                            {editItemType === 'packing' ? (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        項目名稱 *
                                    </label>
                                    <input
                                        type="text"
                                        value={editItemText}
                                        onChange={e => setEditItemText(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                        required
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            項目名稱 *
                                        </label>
                                        <input
                                            type="text"
                                            value={editItemText}
                                            onChange={e => setEditItemText(e.target.value)}
                                            style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            數量
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editItemQuantity}
                                            onChange={e => setEditItemQuantity(e.target.value)}
                                            style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {editItemType === 'souvenir' && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                        備註
                                    </label>
                                    <input
                                        type="text"
                                        value={editItemRemark}
                                        onChange={e => setEditItemRemark(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem' }}
                                    />
                                </div>
                            )}

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
