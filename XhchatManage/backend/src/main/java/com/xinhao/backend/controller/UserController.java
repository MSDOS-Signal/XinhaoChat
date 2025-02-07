package com.xinhao.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xinhao.backend.entity.User;
import com.xinhao.backend.common.Result;

import com.xinhao.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

@RestController
@CrossOrigin
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    public Result<?> save(@RequestBody User user) {
        try {
            boolean success = userService.saveUser(user);
            return success ? Result.success() : Result.error("500", "操作失败");
        } catch (Exception e) {
            return Result.error("500", e.getMessage());
        }
    }

    @GetMapping
    public List<User> findAll() {
        return userService.list();
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Integer id) {
        try {
            if (id == null) {
                return Result.error("500", "ID不能为空");
            }
            boolean success = userService.removeUserById(id);
            return success ? Result.success() : Result.error("500", "删除失败");
        } catch (Exception e) {
            return Result.error("500", e.getMessage());
        }
    }

    @PostMapping("/del/batch")
    public Result<?> deleteBatch(@RequestBody List<Integer> ids) {
        try {
            if (ids == null || ids.isEmpty()) {
                return Result.error("500", "ID列表不能为空");
            }
            boolean success = userService.removeUserByIds(ids);
            return success ? Result.success() : Result.error("500", "批量删除失败");
        } catch (Exception e) {
            return Result.error("500", e.getMessage());
        }
    }

    @GetMapping("/page")
    public Result<IPage<User>> findPage(
            @RequestParam Integer pageNum,
            @RequestParam Integer pageSize,
            @RequestParam(defaultValue = "") String username,
            @RequestParam(defaultValue = "") String nickname,
            @RequestParam(defaultValue = "") String address,
            @RequestParam(defaultValue = "") String phone,
            @RequestParam(defaultValue = "") String email) {
        IPage<User> page = new Page<>(pageNum, pageSize);
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        
        if (!"".equals(username)) {
            queryWrapper.like("username", username);
        }
        if (!"".equals(nickname)) {
            queryWrapper.like("nickname", nickname);
        }
        if (!"".equals(address)) {
            queryWrapper.like("address", address);
        }
        if (!"".equals(phone)) {
            queryWrapper.like("phone", phone);
        }
        if (!"".equals(email)) {
            queryWrapper.like("email", email);
        }
        
        queryWrapper.orderByDesc("id");
        try {
            IPage<User> result = userService.page(page, queryWrapper);
            return Result.success(result);

        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("500", e.getMessage());
        }
    }


    @PostMapping("/import")
    public Result<?> importExcel(MultipartFile file) throws IOException {
        userService.importExcel(file);
        return Result.success();
    }
    
    @GetMapping("/export")
    public void export(HttpServletResponse response) throws IOException {
        userService.exportData(response);
    }

    @GetMapping("/today")
    public Result<Map<String, Object>> getTodayUsers() {
        return Result.success(userService.getTodayUsers());
    }

    @GetMapping("/growth")
    public Result<Map<String, Object>> getUserGrowth() {
        return Result.success(userService.getUserGrowth());
    }

    @GetMapping("/region")
    public Result<Map<String, Integer>> getRegionDistribution() {
        return Result.success(userService.getRegionDistribution());
    }

    @GetMapping("/test")
    public String test() {
        try {
            List<User> users = userService.list();
            return "连接成功，用户数：" + users.size();
        } catch (Exception e) {
            e.printStackTrace();
            return "连接失败：" + e.getMessage();
        }
    }

    @GetMapping("/check/{username}")
    public Result<User> checkUsername(@PathVariable String username) {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("username", username);
        return Result.success(userService.getOne(queryWrapper));
    }

    @PostMapping("/update")
    public Result<?> update(@RequestBody User user) {
        try {
            if (user.getId() == null) {
                return Result.error("500", "用户ID不能为空");
            }
            boolean success = userService.updateUser(user);
            return success ? Result.success() : Result.error("500", "修改失败");
        } catch (Exception e) {
            return Result.error("500", e.getMessage());
        }
    }
}

