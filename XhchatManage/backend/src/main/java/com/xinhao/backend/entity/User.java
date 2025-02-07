package com.xinhao.backend.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "users")
public class User {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String username;
    @JsonIgnore
    private String password;
    private String avatar;
    private String email;
    private String phone;
    
    @TableField("is_online")
    private Integer isOnline;
    
    @TableField("last_seen")
    private LocalDateTime lastSeen;
    
    @TableField("created_at")
    private LocalDateTime createdAt;
    
    private String gender;
    private Integer age;
    private String nickname;
    private String address;
}
