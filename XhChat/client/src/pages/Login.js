import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/chat');
    } catch (error) {
      console.error('登录失败:', error);
      message.error(error.response?.data?.error || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand-section">
          <h1 className="login-title">欢迎使用炘聊</h1>
          <p className="subtitle">与世界保持联系</p>
        </div>
        <Form
          name="login"
          className="login-form"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <div className="form-grid">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input 
                prefix={<UserOutlined className="form-icon" />} 
                placeholder="用户名" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="form-icon" />}
                placeholder="密码"
              />
            </Form.Item>
          </div>

          <Form.Item className="form-actions">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className="submit-button"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        <div className="register-link">
          <span className="register-text">还没有账号？</span>
          <Link to="/register" className="login-link">立即注册</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 