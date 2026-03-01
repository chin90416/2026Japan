import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaCalendarAlt, FaMoneyBillWave, FaShoppingBag, FaInfoCircle } from 'react-icons/fa';

export default function BottomNav() {
    const navStyle = {
        position: 'fixed',
        bottom: 0,
        left: '50%', // 置中對齊以符合 container 寬度
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px', // 與 .container 一致
        height: 'var(--bottom-nav-height)',
        backgroundColor: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)', // 適配 iPhone 底部 Home Indicator
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    };

    const linkStyle = ({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.85rem', // 些微放大字體
        gap: '6px', // 增加圖示與文字距離
        transition: 'color 0.2s',
        padding: '8px 0', // 擴大觸控區域
        flex: 1
    });

    const iconSize = 24; // 圖示放大，原本是 20

    return (
        <nav style={navStyle}>
            <NavLink to="/" style={linkStyle}>
                <FaCalendarAlt size={iconSize} />
                <span>行程</span>
            </NavLink>
            <NavLink to="/shopping" style={linkStyle}>
                <FaShoppingBag size={iconSize} />
                <span>清單</span>
            </NavLink>
            <NavLink to="/expenses" style={linkStyle}>
                <FaMoneyBillWave size={iconSize} />
                <span>記帳</span>
            </NavLink>
            <NavLink to="/info" style={linkStyle}>
                <FaInfoCircle size={iconSize} />
                <span>資訊</span>
            </NavLink>
        </nav>
    );
}
