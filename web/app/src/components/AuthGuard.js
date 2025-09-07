import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tokenManager from '../utils/tokenManager';

const AuthGuard = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = tokenManager.getAccessToken();
                const refreshToken = tokenManager.getRefreshToken();
                
                if (!token || !refreshToken) {
                    // ไม่มี token หรือ refresh token ให้ redirect ไปหน้า login
                    tokenManager.clearTokens();
                    navigate('/login', { replace: true });
                    return;
                }

                if (tokenManager.isTokenExpired()) {
                    // Token หมดอายุ ให้ลองทำ refresh
                    try {
                        await tokenManager.refreshAccessToken();
                        // ถ้า refresh สำเร็จ ให้ตรวจสอบ token ใหม่
                        if (!tokenManager.isTokenExpired()) {
                            setIsAuthenticated(true);
                            setIsLoading(false);
                            return;
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        // ถ้า refresh ล้มเหลว ให้ logout
                        tokenManager.logout();
                        return;
                    }
                }

                // Token ยังใช้งานได้
                setIsAuthenticated(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Auth check error:', error);
                tokenManager.clearTokens();
                navigate('/login', { replace: true });
            }
        };

        checkAuth();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return isAuthenticated ? children : null;
};

export default AuthGuard;
