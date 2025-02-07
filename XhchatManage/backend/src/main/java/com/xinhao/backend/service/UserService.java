package com.xinhao.backend.service;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xinhao.backend.entity.User;
import com.xinhao.backend.mapper.UserMapper;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.read.listener.PageReadListener;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService extends ServiceImpl<UserMapper, User> {
    private int lastTotalCount = -1;  // 初始化为-1，表示未初始化状态
    private LocalDate lastResetDate = LocalDate.now();
    private int todayIncrease = 0;

    @Autowired
    private UserMapper userMapper;

    public boolean saveUser(User user) {
        try {
            if (user.getId() == null) {
                // 新增用户时的处理
                if (this.checkUsernameExists(user.getUsername())) {
                    throw new RuntimeException("用户名已存在");
                }
                // 设置默认值
                user.setCreatedAt(LocalDateTime.now());
                user.setIsOnline(0);
                return this.save(user);  // 使用 save 而不是 saveOrUpdate
            } else {
                // 更新用户时的处理
                User existUser = this.getById(user.getId());
                if (existUser == null) {
                    throw new RuntimeException("用户不存在");
                }
                // 如果修改了用户名，检查新用户名是否存在
                if (!existUser.getUsername().equals(user.getUsername()) 
                    && this.checkUsernameExists(user.getUsername())) {
                    throw new RuntimeException("用户名已存在");
                }
                return this.updateById(user);  // 使用 updateById 而不是 saveOrUpdate
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("操作失败: " + e.getMessage());
        }
    }

    private boolean checkUsernameExists(String username) {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("username", username);
        return this.count(queryWrapper) > 0;
    }

    public void importExcel(MultipartFile file) throws IOException {
        EasyExcel.read(file.getInputStream(), User.class, new PageReadListener<User>(dataList -> {
            saveOrUpdateBatch(dataList);
        })).sheet().doRead();
    }
    
    public void exportData(HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.ms-excel");
        response.setCharacterEncoding("utf-8");
        String fileName = URLEncoder.encode("用户数据", "UTF-8");
        response.setHeader("Content-disposition", "attachment;filename=" + fileName + ".xlsx");
        
        EasyExcel.write(response.getOutputStream(), User.class)
                .sheet("用户数据")
                .doWrite(this.list());
    }

    public Map<String, Object> getTodayUsers() {
        Map<String, Object> result = new HashMap<>();
        
        // 获取当前总数
        int currentTotal = Math.toIntExact(this.count());
        
        // 如果是第一次获取数据
        if (lastTotalCount == -1) {
            lastTotalCount = currentTotal;
        }
        
        LocalDate now = LocalDate.now();
        
        // 如果日期变化，重置计数
        if (!lastResetDate.equals(now)) {
            lastResetDate = now;
            lastTotalCount = currentTotal;
            todayIncrease = 0;
        }
        
        // 如果总数增加，更新今日新增
        if (currentTotal > lastTotalCount) {
            todayIncrease += (currentTotal - lastTotalCount);
            lastTotalCount = currentTotal;
        }
        
        // 获取昨日数据用于计算增长率
        QueryWrapper<User> yesterdayQuery = new QueryWrapper<>();
        LocalDateTime yesterdayStart = LocalDateTime.of(now.minusDays(1), LocalTime.MIN);
        LocalDateTime yesterdayEnd = LocalDateTime.of(now.minusDays(1), LocalTime.MAX);
        yesterdayQuery.between("created_at", yesterdayStart, yesterdayEnd);
        int yesterdayCount = Math.toIntExact(this.count(yesterdayQuery));
        
        // 计算增长率
        double growthRate = yesterdayCount == 0 ? 0 : ((todayIncrease - yesterdayCount) * 100.0 / yesterdayCount);
        
        result.put("total", currentTotal);
        result.put("todayCount", todayIncrease);
        result.put("yesterdayCount", yesterdayCount);
        result.put("growthRate", String.format("%.1f", growthRate));
        
        return result;
    }

    // 修改 getUserGrowth 方法，使用实际的每日统计数据
    public Map<String, Object> getUserGrowth() {
        Map<String, Object> result = new HashMap<>();
        List<String> dates = new ArrayList<>();
        List<Integer> totalCounts = new ArrayList<>();
        List<Integer> dailyIncrease = new ArrayList<>();
        
        LocalDate now = LocalDate.now();
        
        // 获取最近7天的数据
        for (int i = 6; i >= 0; i--) {
            LocalDate date = now.minusDays(i);
            LocalDateTime dayStart = LocalDateTime.of(date, LocalTime.MIN);
            LocalDateTime dayEnd = LocalDateTime.of(date, LocalTime.MAX);
            
            // 格式化日期
            String dayStr = date.format(DateTimeFormatter.ofPattern("M-d"));
            dates.add(dayStr);
            
            // 获取当天新增用户数
            QueryWrapper<User> dailyQuery = new QueryWrapper<>();
            dailyQuery.between("created_at", dayStart, dayEnd);
            int daily = Math.toIntExact(this.count(dailyQuery));
            dailyIncrease.add(daily);
            
            // 获取截至当天的总用户数
            QueryWrapper<User> totalQuery = new QueryWrapper<>();
            totalQuery.le("created_at", dayEnd);
            totalCounts.add(Math.toIntExact(this.count(totalQuery)));
        }
        
        result.put("dates", dates);
        result.put("totalCounts", totalCounts);
        result.put("dailyIncrease", dailyIncrease);
        return result;
    }

    public Map<String, Integer> getRegionDistribution() {
        List<User> users = this.list();
        Map<String, Integer> regionCount = new HashMap<>();
        
        for (User user : users) {
            if (user.getAddress() != null && !user.getAddress().equals("(Null)") && user.getAddress().length() >= 2) {
                String region = user.getAddress().substring(0, 2);
                regionCount.merge(region, 1, Integer::sum);
            }
        }
        
        // 如果没有地址数据，添加一个默认值
        if (regionCount.isEmpty()) {
            regionCount.put("未知", Math.toIntExact(this.count()));
        }
        
        return regionCount;
    }

    // 重写删除方法，先删除关联数据
    @Transactional
    public boolean removeUserById(Integer id) {
        try {
            // 1. 删除用户相关的消息读取记录和消息
            userMapper.deleteMessageReads(id);
            userMapper.deleteMessages(id);

            // 2. 获取并删除用户拥有的会话及其相关数据
            List<Integer> conversationIds = userMapper.findUserConversationIds(id);
            for (Integer conversationId : conversationIds) {
                // 按照依赖关系顺序删除：
                // a. 先删除消息的读取记录
                userMapper.deleteMessageReadsByConversationId(conversationId);
                // b. 再删除消息
                userMapper.deleteMessagesByConversationId(conversationId);
                // c. 然后删除会话参与者
                userMapper.deleteConversationParticipantsByConversationId(conversationId);
                // d. 最后删除会话
                userMapper.deleteConversationById(conversationId);
            }

            // 3. 删除用户参与的其他会话的记录
            userMapper.deleteConversationParticipants(id);

            // 4. 删除好友关系
            userMapper.deleteFriendships(id);

            // 5. 最后删除用户
            return removeById(id);
        } catch (Exception e) {
            throw new RuntimeException("删除失败: " + e.getMessage());
        }
    }

    // 重写批量删除方法
    @Transactional
    public boolean removeUserByIds(List<Integer> ids) {
        try {
            for (Integer id : ids) {
                // 对每个用户执行相同的删除流程
                if (!removeUserById(id)) {
                    throw new RuntimeException("删除用户ID=" + id + "失败");
                }
            }
            return true;
        } catch (Exception e) {
            throw new RuntimeException("批量删除失败: " + e.getMessage());
        }
    }

    public boolean updateUser(User user) {
        try {
            User existUser = this.getById(user.getId());
            if (existUser == null) {
                throw new RuntimeException("用户不存在");
            }
            // 如果修改了用户名，检查新用户名是否存在
            if (!existUser.getUsername().equals(user.getUsername()) 
                && this.checkUsernameExists(user.getUsername())) {
                throw new RuntimeException("用户名已存在");
            }
            return this.updateById(user);
        } catch (Exception e) {
            throw new RuntimeException("修改失败: " + e.getMessage());
        }
    }

    public boolean hasUserConversations(Integer userId) {
        return userMapper.countUserConversations(userId) > 0;
    }
}
//    @Autowired
//    private UserMapper userMapper;
//    public int save(User user){
//        if(user.getId()==null){ //user没有id，则表示新增
//          return  userMapper.insert(user);
//        }else { //否则为更新
//          return  userMapper.update(user);
//        }
//    }

