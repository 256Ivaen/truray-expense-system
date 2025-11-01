import axios from 'axios';

export const BASE_URL = 'https://orange-ferret-922211.hostingersite.com/api/';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const saveAuthData = (token: string, user: any): void => {
  localStorage.setItem('truray_jwt', token);
  localStorage.setItem('truray_user', JSON.stringify(user));
  localStorage.setItem('truray_isLoggedIn', 'true');
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('truray_jwt');
};

export const getCurrentUser = (): any | null => {
  const userStr = localStorage.getItem('truray_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isLoggedIn = (): boolean => {
  return localStorage.getItem('truray_isLoggedIn') === 'true';
};

export const logout = (): void => {
  localStorage.removeItem('truray_jwt');
  localStorage.removeItem('truray_user');
  localStorage.removeItem('truray_isLoggedIn');
  window.location.href = '/login';
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (isLoggedIn() && !isLoginEndpoint) {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export const get = async <T>(url: string, params?: object): Promise<T> => {
  const response = await axiosInstance.get<T>(url, { params });
  return response.data;
};

export const post = async <T>(url: string, data?: object): Promise<T> => {
  const response = await axiosInstance.post<T>(url, data);
  return response.data;
};

export const put = async <T>(url: string, data?: object): Promise<T> => {
  const response = await axiosInstance.put<T>(url, data);
  return response.data;
};

export const del = async <T>(url: string): Promise<T> => {
  const response = await axiosInstance.delete<T>(url);
  return response.data;
};

export const upload = async <T>(url: string, formData: FormData): Promise<T> => {
  const response = await axiosInstance.post<T>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const patch = async <T>(url: string, data?: object): Promise<T> => {
  const response = await axiosInstance.patch<T>(url, data);
  return response.data;
};