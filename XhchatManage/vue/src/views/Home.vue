<script>
import * as echarts from 'echarts'

export default {
  name: "Home",
  data() {
    return {
      currentTime: '',
      totalUsers: 0,
      todayUsers: 0,
      yesterdayUsers: 0,
      growthRate: 0,
      charts: {},
      growthData: {
        months: [],
        counts: [],
        increase: []
      },
      timer: null,
      refreshInterval: null,
      midnightTimeout: null,
      regionData: []
    }
  },
  created() {
    this.updateTime()
    setInterval(this.updateTime, 1000)
  },
  async mounted() {
    await this.initData()
    this.initCharts()
    this.setupRefreshSchedule()
  },
  methods: {
    updateTime() {
      const now = new Date()
      this.currentTime = now.toLocaleString('zh-CN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    setupRefreshSchedule() {
      // 每分钟刷新一次数据
      this.refreshInterval = setInterval(async () => {
        await this.initData()
        this.initCharts()
      }, 60000)

      // 计算到下一个凌晨的时间并设置重置
      this.scheduleMidnightReset()
    },
    scheduleMidnightReset() {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const timeUntilMidnight = tomorrow - now
      
      this.midnightTimeout = setTimeout(() => {
        this.initData()
        this.initCharts()
        this.scheduleMidnightReset() // 重新设置下一天的定时器
      }, timeUntilMidnight)
    },
    async initData() {
      try {
        // 获取今日数据（包含总数）
        const todayRes = await this.request.get("/user/today")
        if (todayRes.data) {
          this.totalUsers = todayRes.data.total // 使用后端返回的total
          this.todayUsers = todayRes.data.todayCount
          this.yesterdayUsers = todayRes.data.yesterdayCount
          this.growthRate = todayRes.data.growthRate
        }
        
        // 获取增长趋势
        const growthRes = await this.request.get("/user/growth")
        if (growthRes.data) {
          this.growthData = {
            months: growthRes.data.dates,
            counts: growthRes.data.totalCounts,
            increase: growthRes.data.dailyIncrease
          }
        }

        // 获取地区分布数据
        const regionRes = await this.request.get("/user/region")
        if (regionRes.data) {
          this.regionData = Object.entries(regionRes.data).map(([name, value]) => ({
            name,
            value
          }))
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      }
    },
    initCharts() {
      // 用户增长趋势图
      const growthChart = echarts.init(document.getElementById('userGrowthChart'))
      growthChart.setOption({
        title: { 
          text: '用户数据统计',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal'
          }
        },
        tooltip: { 
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        legend: {
          data: ['总用户数', '日增用户数']
        },
        xAxis: {
          type: 'category',
          data: this.growthData.months,
          axisLabel: {
            interval: 0
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '总用户数'
          },
          {
            type: 'value',
            name: '日增用户数'
          }
        ],
        series: [
          {
            name: '总用户数',
            type: 'line',
            smooth: true,
            data: this.growthData.counts,
            itemStyle: { color: '#1890ff' }
          },
          {
            name: '日增用户数',
            type: 'bar',
            yAxisIndex: 1,
            data: this.growthData.increase,
            itemStyle: { color: '#36cfc9' }
          }
        ]
      })

      // 用户分布饼图
      const distributionChart = echarts.init(document.getElementById('userDistributionChart'))
      distributionChart.setOption({
        title: { 
          text: '用户地区分布',
          left: 'center'
        },
        tooltip: { 
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          top: 'middle'
        },
        series: [{
          name: '地区分布',
          type: 'pie',
          radius: '50%',
          center: ['60%', '50%'],
          data: this.regionData || [],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: true,
            formatter: '{b}: {d}%'
          }
        }]
      })

      // 保存图表实例
      this.charts = {
        growthChart,
        distributionChart
      }

      // 监听窗口大小变化，调整图表大小
      window.addEventListener('resize', () => {
        Object.values(this.charts).forEach(chart => chart.resize())
      })
    },
    handleExport() {
      window.open('http://localhost:9191/user/export')
    }
  },
  beforeDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    if (this.midnightTimeout) {
      clearTimeout(this.midnightTimeout)
    }
    // 销毁图表实例
    Object.values(this.charts).forEach(chart => chart.dispose())
    window.removeEventListener('resize', this.handleResize)
  }
}
</script>

<template>
  <div class="home-container">
    <!-- 用户总数卡片 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="total-card">
          <div class="total-users">
            <div class="info">
              <div class="title">用户总数</div>
              <div class="number">{{ totalUsers }}</div>
              <div class="desc">系统用户数量统计</div>
            </div>
            <i class="el-icon-user-solid icon"></i>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="total-card">
          <div class="total-users" style="background: linear-gradient(to right, #36cfc9, #40a9ff)">
            <div class="info">
              <div class="title">今日新增</div>
              <div class="number">{{ todayUsers }}</div>
              <div class="desc">
                较昨日
                <span :class="growthRate >= 0 ? 'up' : 'down'">
                  {{ growthRate >= 0 ? '+' : '' }}{{ growthRate }}%
                </span>
              </div>
            </div>
            <i class="el-icon-data-line icon"></i>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表卡片 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <div id="userGrowthChart" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <div id="userDistributionChart" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷功能区域 -->
    <div class="shortcut-section">
      <div class="section-title">
        <i class="el-icon-s-operation"></i>
        快捷功能
      </div>
      <div class="shortcut-grid">
        <router-link to="/manage/user" class="shortcut-item">
          <i class="el-icon-user"></i>
          <span>用户管理</span>
        </router-link>
        <router-link to="/manage/chat" class="shortcut-item">
          <i class="el-icon-chat-dot-round"></i>
          <span>聊天管理</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 20px;
}

.total-card {
  margin-bottom: 20px;
}

.total-users {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(to right, #1890ff, #36cfc9);
  border-radius: 8px;
  color: white;
}

.total-users .info {
  flex: 1;
  margin-right: 20px;
}

.total-users .info .title {
  font-size: 16px;
  margin-bottom: 10px;
  opacity: 0.9;
}

.total-users .info .number {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 5px;
  line-height: 1;
}

.total-users .info .desc {
  font-size: 14px;
  opacity: 0.7;
}

.total-users .icon {
  font-size: 64px;
  opacity: 0.8;
}

.section-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 4px solid #1890ff;
}

.quick-item {
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-item:hover {
  background-color: #1890ff;
  color: white;
  transform: translateY(-5px);
}

.quick-item i {
  font-size: 30px;
  margin-bottom: 10px;
}

.quick-item span {
  font-size: 14px;
}

.up {
  color: #67C23A;
}
.down {
  color: #F56C6C;
}

.shortcut-section {
  margin-top: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.shortcut-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.shortcut-item {
  width: calc(50% - 10px);
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.shortcut-item:hover {
  background-color: #1890ff;
  color: white;
  transform: translateY(-5px);
}

.shortcut-item i {
  font-size: 30px;
  margin-bottom: 10px;
}

.shortcut-item span {
  font-size: 14px;
}
</style>