<script>
export default {
  name: "Header",
  props: {
    collapseBtnClass: String,
    collapse: Function
  },
  computed: {
    currentPath() {
      return this.$route.meta.title || this.$route.name
    },
    breadcrumbs() {
      const title = this.currentPath
      return title ? title.split('/') : []
    },
    isHomePage() {
      return this.$route.path === '/manage/home'
    }
  }
}
</script>

<template>
  <div style="font-size: 12px;line-height: 60px;display: flex">
    <div style="flex: 1;font-size: 20px">
      <span :class="collapseBtnClass" style="cursor: pointer" @click="collapse"></span>
      <el-breadcrumb separator="/" style="display: inline-block;margin-left: 10px">
        <el-breadcrumb-item>首页</el-breadcrumb-item>
        <template v-if="!isHomePage && currentPath">
          <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
            {{ item }}
          </el-breadcrumb-item>
        </template>
      </el-breadcrumb>
    </div>
    <el-dropdown style="width: 100px;cursor: pointer">
      <span>管理员</span><i class="el-icon-arrow-down" style="margin-left: 5px"></i>
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item>个人信息</el-dropdown-item>
        <el-dropdown-item>退出</el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
  </div>
</template>

<style scoped>

</style>