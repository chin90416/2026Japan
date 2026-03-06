import React, { useState } from 'react';
import { FaCheckCircle, FaRegCircle, FaTrash, FaPlus, FaTimes, FaEdit, FaStickyNote } from 'react-icons/fa';
import { SwipeToDeleteWrapper } from '../common/SwipeToDeleteWrapper';
import { subscribeToPackingList, addPackingItem, deletePackingItem, updatePackingItem } from '../../services/db';
import ImageCropper from '../common/ImageCropper';
import { uploadImage, deleteImage } from '../../services/storage';
import { v4 as uuidv4 } from 'uuid';
import { FaImage, FaCamera, FaCameraRetro } from 'react-icons/fa';

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
    const [editItemImageUrl, setEditItemImageUrl] = useState('');

    // Souvenir Detail Modal State
    const [selectedSouvenir, setSelectedSouvenir] = useState(null);

    // Image Upload & Cropper States
    const [selectedImageSrc, setSelectedImageSrc] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [tempCroppedFile, setTempCroppedFile] = useState(null); // The actual File object to upload
    const [tempCroppedPreview, setTempCroppedPreview] = useState(null); // The local blob URL for preview
    const [isUploading, setIsUploading] = useState(false);

    // --- Image Selection Handler ---
    const handleImageSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setSelectedImageSrc(reader.result);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Reset input so same file can be selected again
    };

    const handleCropComplete = (croppedFile, previewUrl) => {
        setTempCroppedFile(croppedFile);
        setTempCroppedPreview(previewUrl);
        setIsCropping(false);
        setSelectedImageSrc(null);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        const tempId = `temp-${uuidv4()}`;
        const itemData = {
            text: newItemText.trim(),
            checked: false,
            type: activeTab,
            timestamp: Date.now()
        };

        if (activeTab === 'souvenir') {
            itemData.remark = newRemarkText.trim();
            itemData.quantity = newItemQuantity.toString().trim() || '1';

            if (tempCroppedFile) {
                setIsUploading(true);
                try {
                    const fileName = `souvenirs/${uuidv4()}_${tempCroppedFile.name}`;
                    const url = await uploadImage(tempCroppedFile, fileName);
                    itemData.imageUrl = url;
                } catch (error) {
                    console.error("Upload failed", error);
                    alert("上傳圖片失敗，將僅儲存文字資訊。");
                } finally {
                    setIsUploading(false);
                }
            }
        }

        // Optimistic UI update
        const optimisticItem = { id: tempId, ...itemData };
        setItems(prev => [optimisticItem, ...prev]);

        setNewItemText('');
        setNewRemarkText('');
        setNewItemQuantity('1');
        setTempCroppedFile(null);
        setTempCroppedPreview(null);
        setShowAddModal(false);

        try {
            await addPackingItem(itemData);
        } catch (error) {
            console.error("Failed to add item", error);
            // Rollback optimistic update
            setItems(prev => prev.filter(item => item.id !== tempId));
            alert("新增項目失敗，請稍後再試。");
        }
    };

    const openEditModal = (item) => {
        setEditItemId(item.id);
        setEditItemText(item.text);
        setEditItemRemark(item.remark || '');
        setEditItemQuantity(item.quantity || '1');
        setEditItemType(item.type);
        setEditItemImageUrl(item.imageUrl || '');
        setTempCroppedFile(null);
        setTempCroppedPreview(null);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editItemText.trim()) return;

        const targetItem = items.find(item => item.id === editItemId);
        if (!targetItem) return;

        const updateData = {
            text: editItemText.trim(),
            timestamp: Date.now() // Ensure it has a timestamp for ordering
        };

        if (editItemType === 'souvenir') {
            updateData.remark = editItemRemark.trim();
            updateData.quantity = editItemQuantity.toString().trim() || '1';

            if (tempCroppedFile) {
                setIsUploading(true);
                try {
                    // Upload new image
                    const fileName = `souvenirs/${uuidv4()}_${tempCroppedFile.name}`;
                    const url = await uploadImage(tempCroppedFile, fileName);
                    updateData.imageUrl = url;

                    // If there was an old image, delete it to save space
                    if (targetItem.imageUrl && targetItem.imageUrl !== url) {
                        await deleteImage(targetItem.imageUrl);
                    }
                } catch (error) {
                    console.error("Upload failed", error);
                    alert("更新圖片失敗，將保留原有圖片。");
                } finally {
                    setIsUploading(false);
                }
            }
        }

        setShowEditModal(false);

        // Optimistic UI update
        setItems(items.map(item => item.id === editItemId ? { ...item, ...updateData } : item));

        // DB update
        await updatePackingItem(editItemId, updateData);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("確定要刪除這個項目嗎？")) {
            return;
        }

        const targetItem = items.find(item => item.id === id);
        if (targetItem && targetItem.imageUrl) {
            // Delete image from storage if it exists
            await deleteImage(targetItem.imageUrl);
        }

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

    const currentItems = items.filter(item => {
        // Handle legacy data: items without 'type' default to 'packing'
        const itemType = item.type || 'packing';
        return itemType === activeTab;
    });
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

            {/* Checklist: Pending / Grid for Souvenir */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    待完成 ({pendingItems.length})
                </h3>
                {pendingItems.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '12px' }}>
                        目前沒有待完成的項目
                    </div>
                ) : activeTab === 'souvenir' ? (
                    /* ======== SOUVENIR GRID VIEW ======== */
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                    }}>
                        {pendingItems.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    position: 'relative',
                                    aspectRatio: '1 / 1',
                                    backgroundColor: '#E2E8F0', // Light slate placeholder
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Lazy loaded image */}
                                {item.imageUrl && (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.text}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                )}
                                {/* Default Icon if no image */}
                                {!item.imageUrl && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.3 }}>
                                        <FaCameraRetro size={48} color="#94A3B8" />
                                    </div>
                                )}

                                {/* Delete button top left */}
                                <div
                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                    style={{
                                        position: 'absolute', top: '4px', left: '4px', padding: '6px',
                                        backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '50%',
                                        zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center'
                                    }}
                                >
                                    <FaTrash size={12} color="#E53E3E" />
                                </div>

                                {/* Overlay gradient for text readability */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                                    padding: '30px 6px 6px 6px',
                                    display: 'flex', flexDirection: 'column',
                                    pointerEvents: 'none' // Let clicks pass through
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: item.quantity && parseInt(item.quantity) >= 1 ? '24px' : '0' }}>
                                            {item.text}
                                        </div>
                                    </div>
                                    {item.remark && (
                                        <div style={{
                                            color: '#E2E8F0',
                                            fontSize: '0.65rem',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.remark.split('\n')[0]}
                                        </div>
                                    )}
                                    {/* 固定於右下角的數量標籤 */}
                                    {item.quantity && parseInt(item.quantity) >= 1 && (
                                        <div style={{ position: 'absolute', bottom: '6px', right: '6px', zIndex: 10 }}>
                                            <span style={{ backgroundColor: 'var(--accent-color)', color: 'white', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                x{item.quantity}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Interaction Layer */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                                    {/* Top Left Edit Area - Cover most of image */}
                                    <div style={{ flex: 1 }} onClick={() => setSelectedSouvenir(item)} />
                                    {/* Top Right Toggle Area - 40x40 touch target */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                                        style={{ position: 'absolute', top: '4px', right: '4px', padding: '4px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%' }}
                                    >
                                        <FaRegCircle size={22} color="var(--text-secondary)" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ======== PACKING LIST VIEW ======== */
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
                                                <span style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-secondary)',
                                                    marginTop: '4px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.remark.split('\n')[0]}
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

            {/* Checklist: Completed (Packing only, Souvenir uses Grid for both) */}
            {activeTab === 'packing' && (
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
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwipeToDeleteWrapper>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Photo Grid View For Souvenir Completed Items */}
            {activeTab === 'souvenir' && completedItems.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--success-color)', marginBottom: '12px', marginTop: '24px' }}>
                        已完成 ({completedItems.length})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                    }}>
                        {completedItems.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    position: 'relative',
                                    aspectRatio: '1 / 1',
                                    backgroundColor: '#CBD5E1', // Gray background for completed
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-sm)',
                                    backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    opacity: 0.8,
                                    filter: 'grayscale(50%)' // Slightly desaturate fulfilled items
                                }}
                            >
                                {/* Default Icon if no image */}
                                {!item.imageUrl && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.2 }}>
                                        <FaCameraRetro size={48} color="#000" />
                                    </div>
                                )}

                                {/* Overlay gradient for text readability */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                                    padding: '30px 6px 6px 6px',
                                    display: 'flex', flexDirection: 'column',
                                    pointerEvents: 'none' // Let clicks pass through
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', paddingRight: item.quantity && parseInt(item.quantity) >= 1 ? '24px' : '0' }}>
                                            {item.text}
                                        </div>
                                    </div>
                                    {item.remark && (
                                        <div style={{
                                            color: '#E2E8F0',
                                            fontSize: '0.65rem',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            textDecoration: 'line-through'
                                        }}>
                                            {item.remark.split('\n')[0]}
                                        </div>
                                    )}
                                    {/* 固定於右下角的數量標籤 (已完成) */}
                                    {item.quantity && parseInt(item.quantity) >= 1 && (
                                        <div style={{ position: 'absolute', bottom: '6px', right: '6px', zIndex: 10 }}>
                                            <span style={{ backgroundColor: 'var(--success-color)', color: 'white', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                x{item.quantity}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Interaction Layer */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                                    {/* Top Left Edit Area - Cover most of image */}
                                    <div style={{ flex: 1 }} onClick={() => setSelectedSouvenir(item)} />
                                    {/* Top Right Toggle Area - 40x40 touch target */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                                        style={{ position: 'absolute', top: '4px', right: '4px', padding: '4px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%' }}
                                    >
                                        <FaCheckCircle size={22} color="var(--success-color)" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                    bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 20px + 56px + 16px)', // 統一位於計算機正上方
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
                                <>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            備註
                                        </label>
                                        <textarea
                                            value={newRemarkText}
                                            onChange={e => setNewRemarkText(e.target.value)}
                                            placeholder="例如：數量、購買地點"
                                            style={{ width: '100%', minHeight: '60px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
                                        />
                                    </div>

                                    {/* Image Upload UI */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            商品圖片
                                        </label>
                                        {tempCroppedPreview ? (
                                            <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--accent-color)' }}>
                                                <img src={tempCroppedPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#F8FAFC' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => { setTempCroppedFile(null); setTempCroppedPreview(null); }}
                                                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', zIndex: 10 }}
                                                >
                                                    <FaTimes size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', width: '100%', height: '120px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageSelect}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                                />
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94A3B8', pointerEvents: 'none' }}>
                                                    <FaImage size={28} style={{ marginBottom: '8px' }} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>點擊上傳或拍照</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {isUploading && <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 'bold', flex: 1 }}>處理圖片中...</span>}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempCroppedFile(null);
                                        setTempCroppedPreview(null);
                                        setShowAddModal(false);
                                    }}
                                    disabled={isUploading}
                                    style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: isUploading ? 0.5 : 1 }}
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
                    </div >
                </div >
            )
            }

            {/* Edit Item Modal */}
            {
                showEditModal && (
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
                                    <>
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                備註
                                            </label>
                                            <textarea
                                                value={editItemRemark}
                                                onChange={e => setEditItemRemark(e.target.value)}
                                                style={{ width: '100%', minHeight: '60px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
                                                placeholder="例如：數量、購買地點"
                                            />
                                        </div>

                                        {/* Image Upload UI in Edit Modal */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                更換商品圖片
                                            </label>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {/* Show existing image OR newly cropped preview */}
                                                {(tempCroppedPreview || editItemImageUrl) ? (
                                                    <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--accent-color)' }}>
                                                        <img src={tempCroppedPreview || editItemImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        {tempCroppedPreview && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setTempCroppedFile(null); setTempCroppedPreview(null); }}
                                                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
                                                            >
                                                                <FaTimes size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div style={{ position: 'relative', flex: 1, minHeight: '100px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageSelect}
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                    />
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94A3B8' }}>
                                                        <FaCamera size={24} style={{ marginBottom: '8px' }} />
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{editItemImageUrl ? '重新上傳' : '上傳照片'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {isUploading && <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 'bold', flex: 1 }}>處理圖片中...</span>}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTempCroppedFile(null);
                                            setTempCroppedPreview(null);
                                            setShowEditModal(false);
                                        }}
                                        disabled={isUploading}
                                        style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: isUploading ? 0.5 : 1 }}
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
                )
            }

            {/* Souvenir Detail Modal */}
            {selectedSouvenir && (
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
                }} onClick={() => setSelectedSouvenir(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '0', // 移除全局 padding，讓圖片滿版
                        borderRadius: 'var(--radius-lg)',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '80vh',
                        overflow: 'hidden' // 確保內容不超出圓角
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const itemToEdit = selectedSouvenir;
                                    setSelectedSouvenir(null);
                                    openEditModal(itemToEdit);
                                }}
                                style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            >
                                <FaEdit size={16} />
                            </button>
                            <button
                                onClick={() => setSelectedSouvenir(null)}
                                style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {selectedSouvenir.imageUrl ? (
                            <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f1f5f9', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                <img src={selectedSouvenir.imageUrl} alt={selectedSouvenir.text} loading="lazy" decoding="async" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#e2e8f0' }} />
                            </div>
                        ) : (
                            <div style={{ paddingTop: '100%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', flexShrink: 0 }}>
                                <FaCameraRetro size={64} color="#cbd5e1" />
                            </div>
                        )}

                        <div style={{ overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.4rem' }}>{selectedSouvenir.text}</h2>
                                {selectedSouvenir.quantity && (
                                    <span style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        x{selectedSouvenir.quantity}
                                    </span>
                                )}
                            </div>

                            {selectedSouvenir.remark && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                        <FaStickyNote color="var(--accent-color)" /> 購買資訊與備註
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                                        {selectedSouvenir.remark}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: '16px' }}>
                            <button onClick={() => setSelectedSouvenir(null)} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '24px', fontWeight: 'bold', flex: 1, border: 'none', cursor: 'pointer' }}>
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Cropper Modal */}
            {isCropping && selectedImageSrc && (
                <ImageCropper
                    imageSrc={selectedImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setIsCropping(false);
                        setSelectedImageSrc(null);
                    }}
                />
            )}
        </div >
    );
}
