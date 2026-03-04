import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function login() {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || "";
        const allowedEmails = allowedEmailsStr.split(",").map(e => e.trim().toLowerCase()).filter(e => e);

        if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase())) {
            await signOut(auth);
            throw new Error("此帳號沒有權限存取此行程表");
        }
        return result;
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || "";
                const allowedEmails = allowedEmailsStr.split(",").map(e => e.trim().toLowerCase()).filter(e => e);

                if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase())) {
                    await signOut(auth);
                    setCurrentUser(null);
                } else {
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
