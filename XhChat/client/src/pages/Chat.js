import React, { useState, useEffect, useRef } from 'react';
import { Layout, List, Input, Button, Avatar, Modal, Upload, message, Tabs, Badge, Menu, Dropdown, Form } from 'antd';
import { SendOutlined, UserOutlined, PlusOutlined, UploadOutlined, AudioOutlined, TeamOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Chat.css';
import RecordRTC from 'recordrtc';
import { useNavigate } from 'react-router-dom';
import ProfileForm from '../components/ProfileForm';

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;

const Chat = () => {
  const { user, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [recorder, setRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState(null);

  const loadFriends = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/friends', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('加载好友列表错误:', error);
      message.error('加载好友列表失败');
    }
  };

  const loadConversations = async (retryCount = 3) => {
    try {
      const response = await axios.get('http://localhost:5000/api/messages/conversations', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (Array.isArray(response.data)) {
        setConversations(response.data);
        console.log('加载到的会话数量:', response.data.length);
      } else {
        throw new Error('无效的会话列表数据');
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadConversations(retryCount - 1);
      }
      message.error('加载会话列表失败');
    }
  };

  useEffect(() => {
    if (!user?.token) return;

    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log('Socket已连接，发送认证...');
      newSocket.emit('authenticate', user.token);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error);
      message.error('聊天连接失败，正在重试...');
    });

    newSocket.on('authenticated', (response) => {
      if (response.success) {
        console.log('Socket认证成功');
        setSocket(newSocket);
      } else {
        console.error('Socket认证失败:', response.error);
        message.error('聊天连接失败，请重新登录');
      }
    });

    newSocket.on('receive_message', async (message) => {
      console.log('收到新消息:', message);
      
      // 更新消息列表
      setMessages(prev => {
        if (currentConversation && message.conversation_id === currentConversation.id) {
          const messageExists = prev.some(m => m.id === message.id);
          if (!messageExists) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            return [...prev, message];
          }
        }
        return prev;
      });

      // 更新会话列表
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === message.conversation_id) {
            return {
              ...conv,
              last_message: message.content,
              last_message_type: message.type,
              last_message_time: message.created_at
            };
          }
          return conv;
        });

        const targetConv = updatedConversations.find(c => c.id === message.conversation_id);
        if (targetConv) {
          const otherConvs = updatedConversations.filter(c => c.id !== message.conversation_id);
          return [targetConv, ...otherConvs];
        }
        return updatedConversations;
      });

      // 只有在以下条件都满足时才更新未读计数：
      // 1. 消息不是自己发送的
      // 2. 不是当前选中的会话（通过检查 selected 类名）
      if (message.sender_id !== parseInt(user.id) && 
          currentConversation?.id !== message.conversation_id) {
        const conversationElement = document.querySelector(`.conversation-list .ant-list-item.selected`);
        const isSelected = conversationElement && 
                          conversationElement.getAttribute('data-conversation-id') === message.conversation_id.toString();
        
        if (!isSelected) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
          }));
        }
      }
    });

    newSocket.on('conversation_updated', async ({ conversationId, lastMessage }) => {
      console.log('会话更新:', { conversationId, lastMessage });
      
      // 更新会话列表中的最后一条消息
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              last_message: lastMessage.content,
              last_message_type: lastMessage.type,
              last_message_time: lastMessage.created_at
            };
          }
          return conv;
        });
      });

      // 如果是当前会话，重新加载消息
      if (currentConversation && conversationId === currentConversation.id) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/messages/conversation/${conversationId}`,
            {
              headers: { Authorization: `Bearer ${user.token}` }
            }
          );
          setMessages(response.data);
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (error) {
          console.error('加载消息失败:', error);
        }
      }
    });

    // 修改会话创建事件监听
    newSocket.on('new_conversation', async (data) => {
      console.log('收到新会话通知:', data);
      
      try {
        // 获取新会话的详细信息
        const response = await axios.get(
          `http://localhost:5000/api/conversations/group/${data.conversationId}`,
          {
            headers: { Authorization: `Bearer ${user.token}` }
          }
        );
        
        // 将新会话添加到会话列表的开头
        setConversations(prev => [response.data, ...prev]);
      } catch (error) {
        console.error('加载新会话失败:', error);
        // 如果获取详细信息失败，则重新加载整个会话列表
        loadConversations();
      }
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user?.token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadFriends();
  }, [user.token]);

  useEffect(() => {
    loadConversations();
  }, [user.token]);

  useEffect(() => {
    if (currentConversation) {
      setActiveConversationId(currentConversation.id);
      setUnreadCounts(prev => ({
        ...prev,
        [currentConversation.id]: 0
      }));
    }
  }, [currentConversation]);

  const loadMessages = async (conversationId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('加载消息失败:', error);
      message.error('加载消息失败');
    }
  };

  const handleConversationClick = async (conversation) => {
    try {
      // 如果已经是当前会话，不需要重复处理
      if (currentConversation?.id === conversation.id) {
        setActiveConversationId(conversation.id);
        setUnreadCounts(prev => ({
          ...prev,
          [conversation.id]: 0
        }));
        return;
      }

      setCurrentConversation(conversation);
      setActiveConversationId(conversation.id);

      // 清除该会话的未读消息计数
      setUnreadCounts(prev => ({
        ...prev,
        [conversation.id]: 0
      }));

      // 加载消息
      const response = await axios.get(
        `http://localhost:5000/api/messages/conversation/${conversation.id}`,
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );
      setMessages(response.data);
      
      // 加入会话房间
      if (socket) {
        socket.emit('join_conversation', conversation.id);
      }
      
      // 滚动到底部
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error('加载消息失败:', error);
      message.error('加载消息失败');
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentConversation || !socket) {
      return;
    }

    try {
      const messageData = {
        conversationId: currentConversation.id,
        content: messageInput.trim(),
        type: 'text'
      };

      // 创建临时消息对象
      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversation.id,
        sender_id: parseInt(user.id),
        content: messageInput.trim(),
        type: 'text',
        created_at: new Date().toISOString(),
        nickname: user.nickname,
        username: user.username,
        avatar: user.avatar
      };

      // 立即更新本地消息列表
      setMessages(prev => [...prev, tempMessage]);
      setMessageInput('');

      // 更新会话列表中的最后一条消息
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === currentConversation.id) {
            return {
              ...conv,
              last_message: messageData.content,
              last_message_type: messageData.type,
              last_message_time: new Date().toISOString()
            };
          }
          return conv;
        });

        // 将当前会话移到顶部
        const targetConv = updatedConversations.find(c => c.id === currentConversation.id);
        if (targetConv) {
          const otherConvs = updatedConversations.filter(c => c.id !== currentConversation.id);
          return [targetConv, ...otherConvs];
        }
        return updatedConversations;
      });

      // 发送消息到服务器
      socket.emit('send_message', messageData);

      // 滚动到底部
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
    }
  };

  const searchUsers = async () => {
    try {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      const response = await axios.get(`http://localhost:5000/api/users/search?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      console.log('搜索结果:', response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error('搜索用户失败:', error);
      message.error('搜索用户失败');
    }
  };

  // 修改搜索框的防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addFriend = async (friendId) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/users/friends/add/${friendId}`,
        {},
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      // 通知双方
      socket.emit('conversation_created', {
        conversationId: response.data.conversationId,
        participants: [user.id, friendId]
      });

      message.success('添加好友成功');
      setShowAddFriend(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // 重新加载好友列表和会话列表
      await loadFriends();
      await loadConversations();
    } catch (error) {
      console.error('添加好友失败:', error);
      message.error(error.response?.data?.error || '添加好友失败');
    }
  };

  const handleFileUpload = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过10MB');
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', currentConversation.id);

    try {
      const response = await axios.post('http://localhost:5000/api/messages/upload', formData, {
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // 创建临时消息对象
      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversation.id,
        sender_id: parseInt(user.id),
        content: response.data.url,
        type: 'file',
        created_at: new Date().toISOString(),
        nickname: user.nickname,
        username: user.username,
        avatar: user.avatar
      };

      // 立即更新本地消息列表
      setMessages(prev => [...prev, tempMessage]);

      // 更新会话列表中的最后一条消息
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === currentConversation.id) {
            return {
              ...conv,
              last_message: '[文件]',
              last_message_type: 'file',
              last_message_time: new Date().toISOString()
            };
          }
          return conv;
        });

        // 将当前会话移到顶部
        const targetConv = updatedConversations.find(c => c.id === currentConversation.id);
        if (targetConv) {
          const otherConvs = updatedConversations.filter(c => c.id !== currentConversation.id);
          return [targetConv, ...otherConvs];
        }
        return updatedConversations;
      });

      // 发送消息到服务器
      socket.emit('send_message', {
        conversationId: currentConversation.id,
        content: response.data.url,
        type: 'file'
      });

      // 滚动到底部
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

      return false;
    } catch (error) {
      console.error('文件上传失败:', error);
      message.error('文件上传失败');
      return false;
    }
  };

  const createGroup = async () => {
    try {
      if (!groupName.trim() || selectedUsers.length === 0) {
        message.error('请输入群名称并选择成员');
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/conversations/group',
        {
          name: groupName,
          members: selectedUsers
        },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      const newConversation = response.data;

      // 更新创建者的会话列表
      setConversations(prev => [newConversation, ...prev]);

      // 通知所有参与者（包括创建者）
      socket.emit('group_created', {
        conversationId: newConversation.id,
        participants: [...selectedUsers, user.id],
        conversation: newConversation
      });

      message.success('群聊创建成功');
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedUsers([]);
      
      // 自动切换到新创建的群聊
      handleConversationClick(newConversation);
    } catch (error) {
      console.error('创建群聊失败:', error);
      message.error('创建群聊失败');
    }
  };

  const startRecording = async (e) => {
    e.preventDefault(); // 防止按钮触发默认点击事件
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newRecorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000, // 每秒更新一次
        ondataavailable: () => {
          // 可以在这里添加录音时的动画效果
        }
      });
      
      newRecorder.startRecording();
      setRecorder(newRecorder);
      setIsRecording(true);
      message.info('正在录音...', 0); // 显示录音提示，不自动关闭
    } catch (error) {
      console.error('录音失败:', error);
      message.error('无法访问麦克风');
    }
  };

  const stopRecording = async (e) => {
    e.preventDefault();
    if (recorder && isRecording) {
      message.destroy();
      recorder.stopRecording(async () => {
        const blob = recorder.getBlob();
        if (blob.size < 1000) {
          message.info('录音时间太短');
          setRecorder(null);
          setIsRecording(false);
          return;
        }

        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        formData.append('conversationId', currentConversation.id);

        try {
          const response = await axios.post(
            'http://localhost:5000/api/messages/upload-audio',
            formData,
            {
              headers: { 
                Authorization: `Bearer ${user.token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );

          // 创建临时消息对象
          const tempMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: currentConversation.id,
            sender_id: parseInt(user.id),
            content: response.data.url,
            type: 'audio',
            created_at: new Date().toISOString(),
            nickname: user.nickname,
            username: user.username,
            avatar: user.avatar
          };

          // 立即更新本地消息列表
          setMessages(prev => [...prev, tempMessage]);

          // 滚动到底部
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);

          // 发送消息到服务器
          socket.emit('send_message', {
            conversationId: currentConversation.id,
            content: response.data.url,
            type: 'audio'
          });

        } catch (error) {
          console.error('发送语音消息失败:', error);
          message.error('发送语音消息失败');
        }

        setRecorder(null);
        setIsRecording(false);
      });
    }
  };

  const handleFriendClick = async (friend) => {
    try {
      console.log('点击好友:', friend);
      
      // 查找现有会话
      let conversation = conversations.find(c => 
        c.type === 'private' && 
        c.participant_ids?.split(',').includes(friend.id.toString())
      );

      if (!conversation) {
        console.log('创建新会话...');
        const response = await axios({
          method: 'post',
          url: 'http://localhost:5000/api/conversations/create',
          data: {
            type: 'private',
            participants: [friend.id],
            name: `与 ${friend.username} 的会话`
          },
          headers: { 
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('创建会话响应:', response.data);
        
        // 重新加载会话列表
        const updatedConversations = await loadConversations();
        
        // 在更新后的会话列表中查找新会话
        conversation = updatedConversations.find(c => c.id === response.data.conversationId);
      }

      if (conversation) {
        console.log('切换到会话:', conversation);
        await handleConversationClick(conversation);
      } else {
        throw new Error('无法找到或创建会话');
      }
    } catch (error) {
      console.error('处理好友点击失败:', error);
      message.error(error.response?.data?.error || '无法开始对话');
    }
  };

  const items = [
    {
      key: 'chats',
      label: '会话',
      children: (
        <>
          <Button 
            type="primary" 
            icon={<TeamOutlined />}
            onClick={() => setShowCreateGroup(true)}
            style={{ margin: '10px' }}
          >
            创建群聊
          </Button>
          <List
            className="conversation-list"
            dataSource={conversations}
            renderItem={conversation => (
              <List.Item
                onClick={() => handleConversationClick(conversation)}
                className={currentConversation?.id === conversation.id ? 'selected' : ''}
                data-conversation-id={conversation.id}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{conversation.name}</span>
                      {unreadCounts[conversation.id] > 0 && (
                        <Badge 
                          count={unreadCounts[conversation.id]} 
                          style={{ 
                            backgroundColor: '#ff4d4f',
                            marginLeft: '8px'
                          }}
                        />
                      )}
                    </div>
                  }
                  description={
                    <div style={{ color: '#8c8c8c' }}>
                      {conversation.last_message_type === 'audio' ? '[语音]' : 
                       conversation.last_message_type === 'file' ? '[文件]' : 
                       conversation.last_message || '暂无消息'}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )
    },
    {
      key: 'friends',
      label: '好友',
      children: (
        <>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddFriend(true)}
            style={{ margin: '10px' }}
          >
            添加好友
          </Button>
          <List
            className="friends-list"
            dataSource={friends}
            renderItem={friend => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      src={friend.avatar ? `http://localhost:5000${friend.avatar}` : null}
                      icon={!friend.avatar && <UserOutlined />}
                    />
                  }
                  title={friend.nickname || friend.username}
                  description={
                    <span style={{ color: friend.is_online ? '#52c41a' : '#999' }}>
                      {friend.is_online ? '在线' : '离线'}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )
    }
  ];

  // 用户菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人资料',
      onClick: () => setShowProfile(true)
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '注销',
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  // 添加一个格式化时间的函数
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 今天的消息只显示时间
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 昨天的消息显示"昨天"和时间
    if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 其他显示完整日期和时间
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 添加一个判断文件类型的函数
  const getFileType = (url) => {
    const extension = url.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoTypes = ['mp4', 'webm', 'ogg'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    return 'other';
  };

  // 添加 activeConversationId 的监听器，用于调试
  useEffect(() => {
    console.log('activeConversationId changed:', activeConversationId);
  }, [activeConversationId]);

  return (
    <Layout className="chat-container">
      <Sider width={300} className="chat-sider">
        <div className="user-info">
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="user-profile-trigger">
              <Avatar 
                src={user.avatar ? `http://localhost:5000${user.avatar}` : null}
                icon={!user.avatar && <UserOutlined />} 
              />
              <span className="username">{user.nickname || user.username}</span>
            </div>
          </Dropdown>
        </div>
        <Tabs items={items} />
      </Sider>
      <Layout>
        <Header className="chat-header">
          {currentConversation?.name || '选择一个聊天'}
        </Header>
        <Content className="chat-content">
          {currentConversation ? (
            <div className="messages-container">
              <List
                className="message-list"
                dataSource={messages}
                renderItem={message => {
                  const isMine = message.sender_id === parseInt(user.id);
                  return (
                    <List.Item className={isMine ? 'message-mine' : ''}>
                      {!isMine && (
                        <Avatar 
                          src={message.avatar ? `http://localhost:5000${message.avatar}` : null}
                          icon={!message.avatar && <UserOutlined />}
                        />
                      )}
                      <div className="message-wrapper">
                        <div className="message-meta">
                          {message.nickname || message.username}
                        </div>
                        <div className="message-content">
                          {message.type === 'file' ? (
                            (() => {
                              const fileType = getFileType(message.content);
                              switch (fileType) {
                                case 'image':
                                  return (
                                    <div className="media-wrapper">
                                      <img 
                                        src={`http://localhost:5000${message.content}`}
                                        alt="图片"
                                        className="message-image"
                                        onClick={() => window.open(`http://localhost:5000${message.content}`, '_blank')}
                                      />
                                    </div>
                                  );
                                case 'video':
                                  return (
                                    <div className="media-wrapper">
                                      <video 
                                        controls
                                        className="message-video"
                                        preload="metadata"
                                      >
                                        <source src={`http://localhost:5000${message.content}`} type={`video/${message.content.split('.').pop()}`} />
                                        您的浏览器不支持视频播放
                                      </video>
                                    </div>
                                  );
                                default:
                                  return (
                                    <a href={`http://localhost:5000${message.content}`} target="_blank" rel="noopener noreferrer">
                                      下载文件
                                    </a>
                                  );
                              }
                            })()
                          ) : message.type === 'audio' ? (
                            <audio 
                              controls 
                              src={`http://localhost:5000${message.content}`} 
                              className="audio-message"
                              preload="auto"
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                        <div className="message-time">
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                      {isMine && (
                        <Avatar 
                          src={message.avatar ? `http://localhost:5000${message.avatar}` : null}
                          icon={!message.avatar && <UserOutlined />}
                        />
                      )}
                    </List.Item>
                  );
                }}
              />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="empty-message-container">
              <div className="empty-message-main">
                添加好友后，点击会话，在会话列表选中好友或创建群聊开始聊天！
              </div>
              <div className="empty-message-disclaimer">
                <div className="empty-message-contact">
                  本聊天项目由炘灏墨麒麟制作
                </div>
                <div>
                  微信联系方式：DXH08060927
                </div>
                <div className="empty-message-warning">
                  请勿发布任何违法违规信息，如有违反与该作者一概无关，后果自己承担。
                </div>
              </div>
            </div>
          )}
          <div className="message-input">
            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} />
            </Upload>
            <Button
              icon={<AudioOutlined />}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={isRecording ? 'recording' : ''}
              style={{
                transition: 'all 0.3s',
                background: isRecording ? '#ff4d4f' : undefined,
                borderColor: isRecording ? '#ff4d4f' : undefined,
                color: isRecording ? '#fff' : undefined
              }}
            />
            <Input
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onPressEnter={e => {
                e.preventDefault();
                sendMessage();
              }}
              placeholder="输入消息..."
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
            />
          </div>
        </Content>
      </Layout>

      <Modal
        title="添加好友"
        open={showAddFriend}
        onCancel={() => setShowAddFriend(false)}
        footer={null}
      >
        <Input.Search
          placeholder="搜索用户"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onSearch={searchUsers}
          enterButton
        />
        <List
          className="search-results"
          dataSource={searchResults}
          renderItem={user => (
            <List.Item
              actions={[
                <Button type="primary" onClick={() => addFriend(user.id)}>
                  添加
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={user.username}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="创建群聊"
        open={showCreateGroup}
        onCancel={() => setShowCreateGroup(false)}
        onOk={createGroup}
      >
        <Form layout="vertical">
          <Form.Item label="群聊名称" required>
            <Input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="输入群聊名称"
            />
          </Form.Item>
          <Form.Item label="选择成员" required>
            <List
              dataSource={friends}
              renderItem={friend => (
                <List.Item
                  actions={[
                    <Button
                      type={selectedUsers.includes(friend.id) ? 'primary' : 'default'}
                      onClick={() => {
                        if (selectedUsers.includes(friend.id)) {
                          setSelectedUsers(prev => prev.filter(id => id !== friend.id));
                        } else {
                          setSelectedUsers(prev => [...prev, friend.id]);
                        }
                      }}
                    >
                      {selectedUsers.includes(friend.id) ? '已选' : '选择'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={friend.username}
                  />
                </List.Item>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加个人资料编辑模态框 */}
      <Modal
        title="个人资料"
        open={showProfile}
        onCancel={() => setShowProfile(false)}
        footer={null}
      >
        <ProfileForm user={user} onClose={() => setShowProfile(false)} />
      </Modal>
    </Layout>
  );
};

export default Chat; 