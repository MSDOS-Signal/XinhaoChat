package com.xinhao.backend.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("messages")
public class Message {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer conversationId;
    private Integer senderId;
    private String content;
    private String type;
    private Integer isDeleted;
    private LocalDateTime createdAt;
} 