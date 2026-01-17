const { useEffect, useState, useContext, createContext } = require("react")
const React = require("react")


// THE context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Refresh persistance
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token')
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Login
    // UPDATE: Now accepts 'token' as the second argument
    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
            localStorage.setItem('token', token);
        }
    };

    // Logout
    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Clear the token too
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Hook for context
export const useAuth = () => useContext(AuthContext);

