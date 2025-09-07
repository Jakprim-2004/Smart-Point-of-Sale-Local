import axios from 'axios';
import config from '../config';
import Swal from 'sweetalert2';

class TokenManager {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        
        // Setup axios interceptors
        this.setupAxiosInterceptors();
        
        // Start token refresh timer
        this.startRefreshTimer();
    }

    setupAxiosInterceptors() {
        // Request interceptor - เพิ่ม token ในทุก request
        axios.interceptors.request.use((config) => {
            const token = this.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        // Response interceptor - จัดการ token หมดอายุ
        axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && 
                    (error.response?.data?.error === 'TOKEN_EXPIRED' || 
                     error.response?.data?.error === 'TOKEN_INVALID') &&
                    !originalRequest._retry) {
                    
                    if (this.isRefreshing) {
                        // ถ้ากำลัง refresh อยู่ ให้เพิ่มเข้า queue
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return axios(originalRequest);
                        }).catch(err => {
                            return Promise.reject(err);
                        });
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        const newToken = await this.refreshAccessToken();
                        this.processQueue(null, newToken);
                        
                        // ลองทำ request ใหม่ด้วย token ใหม่
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return axios(originalRequest);
                    } catch (refreshError) {
                        this.processQueue(refreshError, null);
                        this.logout();
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // ดึง Access Token จาก localStorage
    getAccessToken() {
        return localStorage.getItem(config.token_name);
    }

    // ดึง Refresh Token จาก localStorage
    getRefreshToken() {
        return localStorage.getItem('pos_refresh_token');
    }

    // บันทึก tokens
    setTokens(accessToken, refreshToken) {
        localStorage.setItem(config.token_name, accessToken);
        localStorage.setItem('pos_refresh_token', refreshToken);
        
        // บันทึกเวลาหมดอายุของ access token
        const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 ชั่วโมง
        localStorage.setItem('pos_token_expiry', expiryTime.toString());
        
        // เริ่ม refresh timer ใหม่
        this.startRefreshTimer();
    }

    // ลบ tokens
    clearTokens() {
        localStorage.removeItem(config.token_name);
        localStorage.removeItem('pos_refresh_token');
        localStorage.removeItem('pos_token_expiry');
        localStorage.removeItem('userType');
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // ขอ access token ใหม่ด้วย refresh token
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post(`${config.api_path}`, {
                refreshToken: refreshToken
            }, {
                headers: {
                    // ไม่ใช้ interceptor สำหรับ refresh request
                    'Authorization': undefined
                }
            });

            if (response.data.message === 'success') {
                this.setTokens(response.data.token, response.data.refreshToken);
                return response.data.token;
            } else {
                throw new Error('Failed to refresh token');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            if (error.response?.status === 403) {
                console.error('Refresh token is invalid or expired');
            }
            throw error;
        }
    }

    // จัดการ queue ของ failed requests
    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });
        
        this.failedQueue = [];
    }

    // เริ่ม timer สำหรับ refresh token อัตโนมัติ
    startRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        const expiryTime = localStorage.getItem('pos_token_expiry');
        if (!expiryTime) return;

        const timeUntilExpiry = parseInt(expiryTime) - new Date().getTime();
        // Refresh token ก่อนหมดอายุ 2 นาที
        const refreshTime = Math.max(0, timeUntilExpiry - (2 * 60 * 1000));

        this.refreshTimer = setTimeout(async () => {
            if (this.getAccessToken()) {
                try {
                    await this.refreshAccessToken();
                } catch (error) {
                    console.error('Auto refresh failed:', error);
                    this.logout();
                }
            }
        }, refreshTime);
    }

    // ตรวจสอบว่า token หมดอายุหรือยัง
    isTokenExpired() {
        const expiryTime = localStorage.getItem('pos_token_expiry');
        if (!expiryTime) return true;
        
        return new Date().getTime() >= parseInt(expiryTime);
    }

    // Logout และ redirect
    async logout() {
        const refreshToken = this.getRefreshToken();
        
        // เรียก logout API เพื่อลบ refresh token ออกจาก server
        if (refreshToken) {
            try {
                await axios.post(`${config.api_path}/member/logout`, {
                    refreshToken: refreshToken
                });
            } catch (error) {
                console.error('Logout API error:', error);
                // ถึงแม้ API error ก็ยังต้อง clear tokens
            }
        }
        
        this.clearTokens();
        
        Swal.fire({
            icon: 'warning',
            title: 'Session หมดอายุ',
            text: 'กรุณาเข้าสู่ระบบใหม่',
            confirmButtonText: 'เข้าสู่ระบบ'
        }).then(() => {
            window.location.href = '/login';
        });
    }
}

// สร้าง singleton instance
const tokenManager = new TokenManager();

export default tokenManager;
