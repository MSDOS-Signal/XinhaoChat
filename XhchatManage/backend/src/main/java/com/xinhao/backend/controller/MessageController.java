package com.xinhao.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xinhao.backend.common.Result;
import com.xinhao.backend.entity.Message;
import com.xinhao.backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/message")
@CrossOrigin
public class MessageController {

    @Autowired
    private MessageService messageService;

    @GetMapping("/page")
    public Result<IPage<Map<String, Object>>> findPage(
            @RequestParam Integer pageNum,
            @RequestParam Integer pageSize,
            @RequestParam(defaultValue = "") String senderId,
            @RequestParam(defaultValue = "") String content) {
        
        IPage<Message> page = new Page<>(pageNum, pageSize);
        QueryWrapper<Message> queryWrapper = new QueryWrapper<>();
        
        if (!"".equals(senderId) && !"null".equals(senderId)) {
            try {
                queryWrapper.eq("sender_id", Integer.parseInt(senderId.trim()));
            } catch (NumberFormatException e) {
                return Result.error("500", "发送者ID必须是数字");
            }
        }
        if (!"".equals(content) && !"null".equals(content)) {
            queryWrapper.like("content", content);
        }
        
        // 只查询未删除的消息
        queryWrapper.eq("is_deleted", 0);
        // 按创建时间倒序排序
        queryWrapper.orderByDesc("created_at");
        
        try {
            IPage<Map<String, Object>> result = messageService.findPageWithUsername(page, queryWrapper);
            return Result.success(result);
        } catch (Exception e) {
            return Result.error("500", "获取消息列表失败：" + e.getMessage());
        }
    }
} 