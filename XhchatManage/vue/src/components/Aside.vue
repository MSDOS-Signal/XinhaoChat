<script>
export default {
  name: "Aside",
  props: {
    isCollapse: Boolean,
    logoTextShow: Boolean
  }
}
</script>

<template>
  <el-menu :default-openeds="['1']" 
           style="min-height: 100%;overflow-x: hidden"
           background-color="rgb(48, 65, 86)"
           text-color="#fff"
           active-text-color="#ffd04b"
           :collapse-transition="false"
           :collapse="isCollapse"
           :default-active="$route.path"
           router>
    <div style="height: 60px;line-height: 60px;text-align: center">
      <img src="../assets/logo.png" alt="" style="width: 20px;position: relative;top: 5px">
      <span style="margin-left: 5px;color: white;font-size: 16px" v-show="logoTextShow">后台管理系统</span>
    </div>
    <el-menu-item index="/manage/home">
      <i class="el-icon-house"></i>
      <span slot="title">首页</span>
    </el-menu-item>
    <el-submenu index="1">
      <template slot="title">
        <i class="el-icon-menu"></i>
        <span slot="title">系统管理</span>
      </template>
      <el-menu-item index="/manage/user">
        <i class="el-icon-user"></i>
        <span slot="title">用户管理</span>
      </el-menu-item>
      <el-menu-item index="/manage/chat">
        <i class="el-icon-chat-dot-round"></i>
        <span slot="title">聊天管理</span>
      </el-menu-item>
    </el-submenu>
  </el-menu>
</template>

<style scoped>

</style>