import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Login.css';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/auth/register', {
        username: values.username,
        password: values.password,
        nickname: values.username, // 初始昵称设置为用户名
        phone: values.phone,
        email: values.email,
        address: values.address
      });
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (error) {
      console.error('注册失败:', error);
      message.error(error.response?.data?.error || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand-section">
          <h1 className="login-title">注册炘聊</h1>
          <p className="subtitle">开启您的即时通讯之旅</p>
        </div>
        <Form
          name="register"
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
              name="phone"
              rules={[
                { required: true, message: '请输入手机号码!' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码!' }
              ]}
            >
              <Input 
                prefix={<PhoneOutlined className="form-icon" />}
                placeholder="手机号码"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱!' },
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="form-icon" />}
                placeholder="邮箱地址"
              />
            </Form.Item>

            <Form.Item
              name="address"
              rules={[{ required: true, message: '请输入所在地区!' }]}
            >
              <Input 
                prefix={<EnvironmentOutlined className="form-icon" />}
                placeholder="所在地区（如：河北石家庄）"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码长度至少6位!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="form-icon" />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认密码!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="form-icon" />}
                placeholder="确认密码"
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
              立即注册
            </Button>
          </Form.Item>
        </Form>
        <div className="register-link">
          <span className="register-text">已有账号？</span>
          <Link to="/login" className="login-link">立即登录</Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 