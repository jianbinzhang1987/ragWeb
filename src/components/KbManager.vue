<template>
  <el-dialog
    v-model="visible"
    title="知识库管理"
    width="500px"
    @close="handleClose"
  >
    <div class="kb-manager">
      <div class="kb-add-section">
        <el-input
          v-model="newKbName"
          placeholder="输入新知识库名称"
          class="kb-input"
          @keyup.enter="handleCreate"
        />
        <el-button type="primary" @click="handleCreate" :disabled="!newKbName.trim()">
          新建
        </el-button>
      </div>

      <el-table :data="knowledgeBases" style="width: 100%" class="kb-table">
        <el-table-column prop="name" label="名称" />
        <el-table-column label="操作" width="100" align="right">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              @click="handleDelete(row)"
              :disabled="row.id === 'default'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { knowledgeApi } from '@/api'
import type { KnowledgeBase } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'refresh': []
}>()

const visible = ref(props.modelValue)
const knowledgeBases = ref<KnowledgeBase[]>([])
const newKbName = ref('')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadKbs()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const loadKbs = async () => {
  try {
    knowledgeBases.value = await knowledgeApi.getList()
  } catch (error) {
    console.error('Failed to load KBs', error)
  }
}

const handleClose = () => {
  newKbName.value = ''
}

const handleCreate = async () => {
  if (!newKbName.value.trim()) return

  try {
    const name = newKbName.value.trim()
    if (knowledgeBases.value.some(k => k.id === name)) {
      ElMessage.warning('知识库名称已存在')
      return
    }
    await knowledgeApi.createKb(name)
    ElMessage.success('创建成功')
    newKbName.value = ''
    await loadKbs()
    emit('refresh')
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const handleDelete = async (kb: KnowledgeBase) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除知识库 "${kb.name}" 吗？该操作将删除库中所有文件且无法恢复。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await knowledgeApi.deleteKb(kb.id)
    ElMessage.success('删除成功')
    await loadKbs()
    emit('refresh')
  } catch {
    // cancelled
  }
}
</script>

<style scoped>
.kb-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.kb-add-section {
  display: flex;
  gap: 10px;
}

.kb-input {
  flex: 1;
}
</style>
