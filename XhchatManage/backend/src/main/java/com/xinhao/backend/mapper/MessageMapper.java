package com.xinhao.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xinhao.backend.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

@Repository
@Mapper
public interface MessageMapper extends BaseMapper<Message> {
} 