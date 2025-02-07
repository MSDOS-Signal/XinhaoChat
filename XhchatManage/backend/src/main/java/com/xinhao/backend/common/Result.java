package com.xinhao.backend.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private String code;
    private String msg;
    private T data;
    
    public static <T> Result<T> success(T data) {
        return new Result<>("200", "操作成功", data);
    }
    
    public static <T> Result<T> success() {
        return new Result<>("200", "操作成功", null);
    }
    
    public static <T> Result<T> error(String code, String msg) {
        return new Result<>(code, msg, null);
    }
} 