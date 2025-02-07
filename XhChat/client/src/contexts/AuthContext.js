import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      // 确保用户数据中的昵称正确
      userData.nickname = userData.nickname || userData.username;
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username,
      password
    });
    
    const { token, user: userData } = response.data;
    // 确保用户数据中的昵称正确
    userData.nickname = userData.nickname || userData.username;
    const fullUserData = { ...userData, token };
    
    setUser(fullUserData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(fullUserData));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  const updateUser = async (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // 确保更新后的用户信息包含 token
    if (!updatedUser.token && user?.token) {
      updatedUser.token = user.token;
    }
    
    // 更新本地存储
    localStorage.setItem('token', updatedUser.token);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 