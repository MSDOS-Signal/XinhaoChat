<script>
export default {
  name: "User",
  data() {
    // 自定义校验规则
    const validateUsername = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入用户名'))
      } else if (value.length < 2 || value.length > 20) {
        callback(new Error('用户名长度在2-20个字符之间'))
      } else {
        callback()
      }
    }
    const validateEmail = (rule, value, callback) => {
      if (value && !value.includes('@')) {
        callback(new Error('邮箱格式不正确'))
      } else {
        callback()
      }
    }
    const validatePhone = (rule, value, callback) => {
      if (value && !/^1\d{10}$/.test(value)) {
        callback(new Error('请输入11位手机号码'))
      } else {
        callback()
      }
    }

    return {
      loading: false,
      form: {},
      rules: {
        username: [
          { required: true, validator: validateUsername, trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, max: 20, message: '密码长度在6-20个字符之间', trigger: 'blur' }
        ],
        phone: [
          { validator: validatePhone, trigger: 'blur' }
        ],
        email: [
          { validator: validateEmail, trigger: 'blur' }
        ]
      },
      dialogFormVisible: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      tableData: [],
      multipleSelection: [],
      username: '',
      nickname: '',
      address: '',
      pageNum: 1,
      phone: '',
      email: ''
    }
  },
  created() {
    this.load()
  },
  methods: {
    async checkUsername(value) {
      if (!this.form.username) return
      try {
        const res = await this.request.get('/user/check/' + this.form.username)
        if (res.data && this.form.id !== res.data.id) {
          this.$message.error('用户名已存在')
          this.form.username = ''
        }
      } catch (error) {
        console.error('检查用户名失败:', error)
      }
    },
    async load() {
      this.loading = true
      try {
        const res = await this.request.get("/user/page", {
          params: {
            pageNum: this.pageNum,
            pageSize: this.pageSize,
            username: this.username,
            nickname: this.nickname,
            address: this.address,
            phone: this.phone,
            email: this.email
          }
        })
        if (res.code === '200') {
          this.tableData = res.data.records
          this.total = res.data.total
        }
      } catch (error) {
        this.$message.error('数据加载失败')
      } finally {
        this.loading = false
      }
    },
    resetForm() {
      this.$refs.form?.resetFields()
      this.form = {}
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row))
      this.dialogFormVisible = true
    },
    async del(id) {
      try {
        const res = await this.request.delete("/user/" + id)
        if (res.code === '200') {
          this.$message.success("删除成功")
          this.load()
        } else {
          this.$message.error(res.msg || "删除失败")
        }
      } catch (error) {
        console.error('删除失败:', error)
        this.$message.error("删除失败")
      }
    },
    async delBatch() {
      try {
        const ids = this.multipleSelection.map(item => item.id)
        const res = await this.request.post("/user/del/batch", ids)
        if (res.code === '200') {
          this.$message.success("批量删除成功")
          this.load()
        } else {
          this.$message.error(res.msg || "批量删除失败")
        }
      } catch (error) {
        console.error('批量删除失败:', error)
        this.$message.error("批量删除失败")
      }
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
    reset() {
      this.username = ''
      this.nickname = ''
      this.address = ''
      this.phone = ''
      this.email = ''
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
    handleDelete(row) {
      this.$confirm('确认删除该用户?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.del(row.id)
      }).catch(() => {})
    },
    handleBatchDelete() {
      if (!this.multipleSelection.length) {
        this.$message.warning('请选择要删除的用户')
        return
      }
      this.$confirm(`确认删除选中的 ${this.multipleSelection.length} 个用户?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.delBatch()
      }).catch(() => {})
    },
    async handleUpdate() {
      this.$refs.form.validate(async valid => {
        if (valid) {
          try {
            const res = await this.request.post("/user/update", this.form)
            if (res.code === '200') {
              this.$message.success('修改成功')
              this.dialogFormVisible = false
              this.load()
            } else {
              this.$message.error(res.msg || '修改失败')
            }
          } catch (error) {
            console.error('修改失败:', error)
            this.$message.error('修改失败')
          }
        }
      })
    }
  }
}
</script>

<template>
  <div class="user-container">
    <!-- 搜索区域 -->
    <div class="search-card">
      <div class="search-inputs">
        <el-input
          v-model="username"
          placeholder="请输入用户名"
          prefix-icon="el-icon-user"
          clearable
          class="search-item"
        />
        <el-input
          v-model="nickname"
          placeholder="请输入昵称"
          prefix-icon="el-icon-user"
          clearable
          class="search-item"
        />
        <el-input
          v-model="address"
          placeholder="请输入地址"
          prefix-icon="el-icon-location"
          clearable
          class="search-item"
        />
        <el-input
          v-model="phone"
          placeholder="请输入电话"
          prefix-icon="el-icon-phone"
          clearable
          class="search-item"
        />
        <el-input
          v-model="email"
          placeholder="请输入邮箱"
          prefix-icon="el-icon-message"
          clearable
          class="search-item"
        />
        <div class="search-btns">
          <el-button type="primary" @click="load" icon="el-icon-search">搜索</el-button>
          <el-button @click="reset" icon="el-icon-refresh">重置</el-button>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-card">
      <el-button 
        type="danger" 
        icon="el-icon-delete" 
        @click="handleBatchDelete"
        :disabled="!multipleSelection.length"
      >批量删除</el-button>
    </div>

    <!-- 表格区域 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
        v-loading="loading"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="username" label="用户名" width="120" align="center" />
        <el-table-column prop="nickname" label="昵称" width="120" align="center" />
        <el-table-column prop="email" label="邮箱" width="180" align="center" />
        <el-table-column prop="phone" label="电话" width="120" align="center" />
        <el-table-column prop="address" label="地址" align="center" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button
              type="primary"
              icon="el-icon-edit"
              size="mini"
              @click="handleEdit(scope.row)"
            >编辑</el-button>
            <el-button
              type="danger"
              icon="el-icon-delete"
              size="mini"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pageNum"
          :page-sizes="[10, 20, 50]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          background
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      title="编辑用户"
      :visible.sync="dialogFormVisible"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="form.username" 
            @blur="checkUsername"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input 
            v-model="form.nickname" 
            placeholder="请输入昵称"
          />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input 
            v-model="form.phone" 
            placeholder="请输入电话号码"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="请输入邮箱"
          />
        </el-form-item>
        <el-form-item label="地址">
          <el-input 
            v-model="form.address" 
            placeholder="请输入地址"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogFormVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleUpdate">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.search-card,
.toolbar-card,
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

.toolbar-card {
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.el-table {
  margin-top: 10px;
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