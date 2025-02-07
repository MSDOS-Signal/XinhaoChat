import React, { useState } from 'react';
import { Form, Input, Button, Upload, Select, InputNumber, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const { Option } = Select;

const ProfileForm = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(user.avatar);
  const { updateUser } = useAuth();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log('提交的表单数据:', values);

      const formData = new FormData();
      
      if (values.nickname) {
        formData.append('nickname', values.nickname);
      }
      if (values.gender) {
        formData.append('gender', values.gender);
      }
      if (values.age !== undefined) {
        formData.append('age', values.age.toString());
      }
      
      // 如果有新头像
      if (values.avatar?.[0]?.originFileObj) {
        formData.append('avatar', values.avatar[0].originFileObj);
      }

      // 打印 FormData 内容（调试用）
      for (let pair of formData.entries()) {
        console.log('FormData 内容:', pair[0], pair[1]);
      }

      const response = await axios.put(
        'http://localhost:5000/api/users/profile',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('服务器响应:', response.data);
      
      // 更新本地存储的用户信息
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      await updateUser(updatedUser);
      
      message.success('个人资料更新成功');
      onClose();
    } catch (error) {
      console.error('更新个人资料失败:', error);
      message.error(error.response?.data?.details || '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (info) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.originFileObj) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片必须小于 2MB！');
    }
    return isImage && isLt2M;
  };

  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <Form
      layout="vertical"
      initialValues={{
        nickname: user.nickname || user.username,
        gender: user.gender || 'male',
        age: user.age || 18
      }}
      onFinish={onFinish}
    >
      <Form.Item
        label="头像"
        name="avatar"
        valuePropName="fileList"
        getValueFromEvent={normFile}
      >
        <Upload
          listType="picture-card"
          showUploadList={false}
          beforeUpload={(file) => {
            const isValid = beforeUpload(file);
            if (isValid) {
              const reader = new FileReader();
              reader.onload = () => {
                setImageUrl(reader.result);
              };
              reader.readAsDataURL(file);
            }
            return false;
          }}
          maxCount={1}
        >
          {imageUrl ? (
            <img 
              src={imageUrl.startsWith('data:') ? imageUrl : `http://localhost:5000${imageUrl}`}
              alt="avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>上传</div>
            </div>
          )}
        </Upload>
      </Form.Item>

      <Form.Item
        label="昵称"
        name="nickname"
        rules={[{ required: true, message: '请输入昵称' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="性别"
        name="gender"
      >
        <Select>
          <Option value="male">男</Option>
          <Option value="female">女</Option>
          <Option value="other">其他</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="年龄"
        name="age"
      >
        <InputNumber min={1} max={120} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          保存
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ProfileForm; 