import React, { createContext, useContext, useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { subscribeToTripSettings, updateTripSettings } from '../services/db';

const GlobalContext = createContext();

export function useGlobal() {
    return useContext(GlobalContext);
}

export function GlobalProvider({ children }) {
    // 匯率狀態 (預設: 1 JPY = 0.21 TWD)
    const [exchangeRate, setExchangeRate] = useState(0.21);

    // 行程日期狀態 (預設: 10/25 起 5 天)
    const [tripDates, setTripDates] = useState([
        '10/25 (Day 1)',
        '10/26 (Day 2)',
        '10/27 (Day 3)',
        '10/28 (Day 4)',
        '10/29 (Day 5)'
    ]);

    // 啟動時訂閱 Firestore
    useEffect(() => {
        const unsubscribe = subscribeToTripSettings((data) => {
            if (data) {
                if (data.exchangeRate) setExchangeRate(data.exchangeRate);
                if (data.tripDates && data.tripDates.length > 0) setTripDates(data.tripDates);
            }
        });
        return () => unsubscribe();
    }, []);

    // 提供給 Info.jsx 呼叫修改雲端匯率的 method
    const changeExchangeRate = async (rate) => {
        setExchangeRate(rate); // 樂觀更新 (Optimistic UI) 
        await updateTripSettings({ exchangeRate: rate });
    };

    // 輔助函式：根據起始日期（YYYY-MM-DD）與天數生成日期陣列
    const generateTripDates = (startDateString, daysCount) => {
        try {
            const [year, month, day] = startDateString.split('-');
            if (!year || !month || !day) return;
            const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

            const newDates = [];
            for (let i = 0; i < daysCount; i++) {
                const currentDate = addDays(startDate, i);
                newDates.push(`${format(currentDate, 'MM/dd')} (Day ${i + 1})`);
            }
            if (newDates.length > 0) {
                setTripDates(newDates); // 樂觀更新
                updateTripSettings({ tripDates: newDates }); // 寫回雲端
            }
        } catch (e) {
            console.error("Invalid date generation", e);
        }
    };

    const value = {
        exchangeRate,
        setExchangeRate: changeExchangeRate,
        tripDates,
        setTripDates,
        generateTripDates
    };

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
}
