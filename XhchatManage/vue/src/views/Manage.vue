<template>
  <div style="height: 100%">
    <el-container style="min-height: 100vh;">
      <el-aside :width="sideWidth + 'px'" style="background-color: rgb(48, 65, 86);min-height: 100%">
        <Aside :isCollapse="isCollapse" :logoTextShow="logoTextShow"/>
      </el-aside>

      <el-container >
        <el-header style="border-bottom: 1px solid #ccc">
          <Header :collapseBtnClass="collapseBtnClass" :collapse="collapse" />
        </el-header>

        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>

  <!--  </div>-->
  <!--  <div class="home">-->
  <!--    <h1>{{ msg }}</h1>-->
  <!--    <el-button type="danger">{{ msg }}</el-button>-->
  <!--    <img alt="Vue logo" src="../assets/logo.png">-->
  <!--    <HelloWorld msg="Welcome to Your Vue.js App"/>-->
  <!--  </div>-->
</template>

<script>
// @ is an alias to /src
// import HelloWorld from '@/components/HelloWorld.vue'

import Aside from "@/components/Aside.vue";
import Header from "@/components/Header.vue";

export default {
  name: 'Manage',
  data() {
    return {
      isCollapse: false,
      sideWidth: 200,
      logoTextShow: true,
      collapseBtnClass: 'el-icon-s-fold'
    }
  },
  components:{
    Aside,
    Header
  },
  methods: {
    collapse() {
      this.isCollapse = !this.isCollapse
      if (this.isCollapse) {
        this.sideWidth = 64
        this.collapseBtnClass = 'el-icon-s-unfold'
        this.logoTextShow = false
      } else {
        this.sideWidth = 200
        this.collapseBtnClass = 'el-icon-s-fold'
        this.logoTextShow = true
      }
    }
  }
}
</script>

