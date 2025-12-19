const { useEffect, useState, useContext, createContext } = require("react")
const React = require("react")


// THE context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Refresh persistance
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // Login
    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
    }

    // Logout
    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        // WILL DO LATER: Redirect to login page
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Hook for context
export const useAuth = () => useContext(AuthContext);

