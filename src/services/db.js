import {
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    getDoc,
    getDocs
} from "firebase/firestore";
import { db } from "../firebase";

// 固定一個主要的 trip ID 來供所有使用者共享共編
const MAIN_TRIP_ID = "main_trip";

// =====全域設定 (旅行基本資訊)===== //
export const subscribeToTripSettings = (callback) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID);
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data());
        } else {
            // 如果不存在，回傳空資料或預設值
            callback(null);
        }
    });
};

export const updateTripSettings = async (data) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID);
    // 使用 { merge: true } 確保如果文檔不存在會自動建立，如果存在則只更新提供的欄位
    await setDoc(docRef, data, { merge: true });
};


// ===== 行程表 (Itineraries) ===== //
// 取得 main_trip 底下的 itineraries
const getItineraryColRef = () => collection(db, "trips", MAIN_TRIP_ID, "itineraries");

export const subscribeToItineraries = (callback) => {
    // 監聽並以 order 排列
    const q = query(getItineraryColRef(), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};

export const addItineraryEvent = async (eventData) => {
    // 預設加上一個 timestamp 與確保 order 存在
    const docRef = await addDoc(getItineraryColRef(), {
        ...eventData,
        order: eventData.order !== undefined ? eventData.order : Date.now(),
        timestamp: Date.now()
    });
    return docRef.id;
};

export const updateItineraryEvent = async (id, updates) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "itineraries", id);
    await updateDoc(docRef, updates);
};

export const deleteItineraryEvent = async (id) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "itineraries", id);
    await deleteDoc(docRef);
};


// ===== 記帳本 (Expenses) ===== //
const getExpensesColRef = () => collection(db, "trips", MAIN_TRIP_ID, "expenses");

export const subscribeToExpenses = (callback) => {
    // 預設使用時間戳排序（越新越前面，可以倒過來排或是在前端排）
    const q = query(getExpensesColRef(), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};

export const addExpense = async (expenseData) => {
    const docRef = await addDoc(getExpensesColRef(), {
        ...expenseData,
        timestamp: Date.now()
    });
    return docRef.id;
};

export const updateExpense = async (id, updates) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "expenses", id);
    await updateDoc(docRef, updates);
};

export const deleteExpense = async (id) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "expenses", id);
    await deleteDoc(docRef);
};


// ===== 行李與伴手禮清單 (Packing List) ===== //
const getPackingColRef = () => collection(db, "trips", MAIN_TRIP_ID, "packing_list");

export const subscribeToPackingList = (callback) => {
    const q = query(getPackingColRef(), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};

export const addPackingItem = async (itemData) => {
    const docRef = await addDoc(getPackingColRef(), {
        ...itemData,
        timestamp: Date.now()
    });
    return docRef.id;
};

export const updatePackingItem = async (id, updates) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "packing_list", id);
    await updateDoc(docRef, updates);
};

export const deletePackingItem = async (id) => {
    const docRef = doc(db, "trips", MAIN_TRIP_ID, "packing_list", id);
    await deleteDoc(docRef);
};
