package com.xinhao.backend.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xinhao.backend.entity.Message;
import com.xinhao.backend.entity.User;
import com.xinhao.backend.mapper.MessageMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class MessageService extends ServiceImpl<MessageMapper, Message> {
    
    @Autowired
    private UserService userService;
    
    public IPage<Map<String, Object>> findPageWithUsername(IPage<Message> page, QueryWrapper<Message> wrapper) {
        IPage<Message> messagePage = this.page(page, wrapper);
        
        // 获取所有发送者ID
        List<Integer> senderIds = messagePage.getRecords().stream()
                .map(Message::getSenderId)
                .distinct()
                .collect(Collectors.toList());
        
        // 获取所有发送者信息
        Map<Integer, User> userMap = userService.listByIds(senderIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        
        // 转换结果，添加发送者用户名
        IPage<Map<String, Object>> resultPage = messagePage.convert(message -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", message.getId());
            map.put("sender_id", message.getSenderId());
            map.put("sender_name", userMap.get(message.getSenderId()) != null ? 
                    userMap.get(message.getSenderId()).getUsername() : "未知用户");
            map.put("content", message.getContent());
            map.put("type", message.getType());
            map.put("created_at", message.getCreatedAt());
            return map;
        });
        
        return resultPage;
    }
} 