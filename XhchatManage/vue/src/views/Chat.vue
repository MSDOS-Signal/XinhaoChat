<template>
  <div class="chat-container">
    <!-- 搜索区域 -->
    <div class="search-card">
      <div class="search-inputs">
        <el-input
          v-model="senderId"
          placeholder="请输入发送者ID"
          prefix-icon="el-icon-user"
          clearable
          class="search-item"
        />
        <el-input
          v-model="content"
          placeholder="请输入聊天内容"
          prefix-icon="el-icon-chat-line-round"
          clearable
          class="search-item"
        />
        <div class="search-btns">
          <el-button type="primary" @click="load" icon="el-icon-search">搜索</el-button>
          <el-button type="warning" @click="reset" icon="el-icon-refresh">重置</el-button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        stripe
        border
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="sender_id" label="发送者ID" width="100" align="center">
          <template slot-scope="scope">
            <el-tooltip :content="'用户名: ' + scope.row.sender_name" placement="top">
              <span>{{ scope.row.sender_id }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="聊天记录" show-overflow-tooltip>
          <template slot-scope="scope">
            <span :class="{'message-text': true, 'system-message': scope.row.type === 'system'}">
              {{ scope.row.content }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.type === 'system' ? 'warning' : 'primary'">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发送时间" width="180" align="center" />
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pageNum"
          :page-sizes="[10, 20, 50]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Chat",
  data() {
    return {
      loading: false,
      senderId: '',
      content: '',
      pageNum: 1,
      pageSize: 10,
      total: 0,
      tableData: [],
      multipleSelection: []
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await this.request.get("/message/page", {
          params: {
            pageNum: this.pageNum,
            pageSize: this.pageSize,
            senderId: this.senderId,
            content: this.content
          }
        })
        this.tableData = res.data.records
        this.total = res.data.total
      } catch (error) {
        this.$message.error('数据加载失败')
      } finally {
        this.loading = false
      }
    },
    reset() {
      this.senderId = ''
      this.content = ''
      this.load()
    },
    handleSizeChange(pageSize) {
      this.pageSize = pageSize
      this.load()
    },
    handleCurrentChange(pageNum) {
      this.pageNum = pageNum
      this.load()
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    }
  }
}
</script>

<style scoped>
.chat-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.search-card,
.table-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  margin-bottom: 20px;
  padding: 20px;
}

.search-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.search-item {
  width: 220px;
}

.search-btns {
  margin-left: auto;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.message-text {
  display: inline-block;
  max-width: 100%;
  word-break: break-all;
}

.system-message {
  color: #E6A23C;
  font-style: italic;
}

@media screen and (max-width: 1200px) {
  .search-item {
    width: 180px;
  }
}

@media screen and (max-width: 768px) {
  .search-inputs {
    flex-direction: column;
  }
  
  .search-item {
    width: 100%;
  }
  
  .search-btns {
    margin-left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
}
</style> 