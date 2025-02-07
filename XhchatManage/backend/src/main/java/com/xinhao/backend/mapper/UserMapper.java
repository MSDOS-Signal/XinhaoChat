package com.xinhao.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xinhao.backend.entity.User;
import org.apache.ibatis.annotations.*;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@Mapper
public interface UserMapper extends BaseMapper<User> {
    @Select("select * from users")
    List<User> findAll();

    @Insert("insert into users(username,password,nickname,address) values(#{username},#{password},#{nickname},#{address})")
    int insert(User user);

    int update(User user);

    @Select("select * from users where username like #{username} limit #{pageNum},#{pageSize}")
    List<User> selectPage(Integer pageNum, Integer pageSize,String username);

    @Select("select count(*) from users where username like concat('%',#{username},'%')")
    Integer selectTotal(String username);

    @Select("SELECT COUNT(*) FROM conversation_participants WHERE user_id = #{userId}")
    Integer countUserConversations(Integer userId);

    @Select("SELECT id FROM conversations WHERE owner_id = #{userId}")
    List<Integer> findUserConversationIds(Integer userId);

    @Delete("DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = #{conversationId})")
    void deleteMessageReadsByConversationId(Integer conversationId);

    @Delete("DELETE FROM messages WHERE conversation_id = #{conversationId}")
    void deleteMessagesByConversationId(Integer conversationId);

    @Delete("DELETE FROM message_reads WHERE user_id = #{userId}")
    void deleteMessageReads(Integer userId);

    @Delete("DELETE FROM messages WHERE sender_id = #{userId}")
    void deleteMessages(Integer userId);

    @Delete("DELETE FROM conversation_participants WHERE conversation_id = #{conversationId}")
    void deleteConversationParticipantsByConversationId(Integer conversationId);

    @Delete("DELETE FROM conversation_participants WHERE user_id = #{userId}")
    void deleteConversationParticipants(Integer userId);

    @Delete("DELETE FROM conversations WHERE id = #{conversationId}")
    void deleteConversationById(Integer conversationId);

    @Delete("DELETE FROM friendships WHERE user_id = #{userId} OR friend_id = #{userId}")
    void deleteFriendships(Integer userId);
}
