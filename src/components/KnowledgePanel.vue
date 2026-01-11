<template>
  <div class="knowledge-panel">
    <div class="panel-header">
      <h2 class="panel-title">知识库管理</h2>
    </div>

    <div class="panel-content">
      <!-- 文件上传区 -->
      <div class="upload-section">
        <el-upload ref="uploadRef" :http-request="customUpload" :before-upload="handleBeforeUpload"
          :on-success="handleUploadSuccess" :on-error="handleUploadError" :show-file-list="false"
          :disabled="!knowledgeBaseId" drag multiple class="upload-dragger">
          <div class="upload-content">
            <div class="upload-icon">📁</div>
            <div class="upload-text">
              <p class="upload-title">拖拽文件至此或点击上传</p>
              <p class="upload-hint">支持 PDF、DOCX、TXT、MD 等格式</p>
            </div>
          </div>
        </el-upload>

        <div v-if="!knowledgeBaseId" class="upload-disabled-hint">
          请先选择知识库
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="files-section">
        <div class="files-header">
          <h3 class="files-title">文件列表</h3>
          <span class="files-count">{{ files.length }}</span>
        </div>

        <div v-if="files.length === 0" class="empty-files">
          <div class="empty-icon">📄</div>
          <p>暂无文件</p>
        </div>

        <template v-else>
          <div class="files-list">
            <div v-for="file in files" :key="file.id" class="file-item clickable" :class="file.status"
              @click="handlePreview(file)">
              <div class="file-icon">
                <span v-if="file.status === 'ready'">✅</span>
                <span v-else-if="file.status === 'parsing'">⏳</span>
                <span v-else-if="file.status === 'failed'">❌</span>
                <span v-else>📄</span>
              </div>

              <div class="file-info">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <span class="file-time">{{ formatTime(file.uploadTime) }}</span>
                </div>
              </div>

              <div class="file-status">
                <el-tag :type="getStatusType(file.status)" size="small" class="status-tag">
                  {{ getStatusText(file.status) }}
                </el-tag>
              </div>

              <div class="file-actions" v-if="file.status === 'failed'" @click.stop>
                <el-button size="small" type="warning" @click="handleReparse(file)">
                  重新解析
                </el-button>
              </div>
            </div>
          </div>

          <div class="pagination-footer" v-if="total !== undefined">
            <el-pagination size="small" background layout="prev, pager, next" :total="total" :page-size="pageSize || 10"
              :current-page="currentPage || 1" @current-change="(val: number) => emit('page-change', val)"
              hide-on-single-page />
          </div>
        </template>
      </div>
    </div>
    <FilePreview v-model="previewVisible" :file-id="previewFileId" :file-name="previewFileName" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileItem } from '@/types'
import { formatFileSize, formatTime } from '@/utils/format'
import { knowledgeApi } from '@/api'
import { ElMessage } from 'element-plus'
import FilePreview from './FilePreview.vue'

const props = defineProps<{
  knowledgeBaseId: string
  files: FileItem[]
  total?: number
  currentPage?: number
  pageSize?: number
}>()


const emit = defineEmits<{
  'file-uploaded': []
  'page-change': [page: number]
}>()

const uploadRef = ref()
// parsingFiles removed

const customUpload = async (options: any) => {
  try {
    await knowledgeApi.uploadFile(props.knowledgeBaseId, options.file)
    ElMessage.success('文件上传成功')
    options.onSuccess()
    // Trigger refresh immediately as parsing is now automatic
    emit('file-uploaded')
  } catch (error: any) {
    // Pass the real error message to onError
    options.onError(error) // This triggers handleUploadError
  }
}

const previewVisible = ref(false)
const previewFileId = ref('')
const previewFileName = ref('')

const handlePreview = (file: FileItem) => {
  previewFileId.value = file.id
  previewFileName.value = file.name
  previewVisible.value = true
}

const handleReparse = async (file: FileItem) => {
  try {
    ElMessage.info('正在重新解析...')
    await knowledgeApi.parseFile(file.id)
    ElMessage.success('解析成功')
    emit('file-uploaded') // Refresh file list
  } catch (error: any) {
    ElMessage.error('解析失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

const handleBeforeUpload = (file: File) => {
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md']
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!allowedExtensions.includes(fileExtension)) {
    ElMessage.error('不支持的文件格式')
    return false
  }

  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }

  return true
}

// ...

const handleUploadSuccess = () => {
  // ElMessage.success('文件上传成功') // Moved to customUpload to avoid potential duplicate (if any) and better control
}

const handleUploadError = (error: any) => {
  // Try to extract useful message. 
  // Error from axios interceptor might be the error object itself.
  // Element Plus wraps it?
  // Usually options.onError(err) passes err to this hook.

  // Checking if it's a "File exists" error
  const msg = error.response?.data?.message || error.message || '文件上传失败'

  if (msg.includes('该文件已存在') || msg.includes('请勿重复上传') || msg.includes('already exists')) {
    ElMessage.warning(msg)
  } else {
    ElMessage.error(msg)
  }
}

// handleParse removed as parsing is automatic

const getStatusType = (status: FileItem['status']) => {
  const typeMap = {
    uploaded: 'info',
    parsing: 'warning',
    ready: 'success',
    failed: 'danger'
  }
  return typeMap[status] as any
}

const getStatusText = (status: FileItem['status']) => {
  const textMap = {
    uploaded: '已上传',
    parsing: '解析中',
    ready: '已就绪',
    failed: '解析失败'
  }
  return textMap[status]
}
</script>

<style scoped>
.knowledge-panel {
  width: 380px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-section {
  position: relative;
}

.upload-dragger {
  width: 100%;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  border: 2px dashed var(--border-input);
  border-radius: 12px;
  background: var(--bg-input);
  padding: 24px;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: var(--accent-primary);
  background: var(--bg-hover);
}

:deep(.el-upload-dragger.is-dragover) {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-rgb), 0.05);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 48px;
  filter: grayscale(0.2);
}

.upload-text {
  text-align: center;
}

.upload-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.upload-disabled-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
  pointer-events: none;
}

.files-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.files-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  font-family: var(--font-display);
}

.files-count {
  font-size: 13px;
  color: var(--text-tertiary);
  background: var(--bg-tag);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.empty-files {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  padding: 40px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: grayscale(0.4);
}

.empty-files p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.file-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  animation: fileSlideIn 0.3s ease;
  cursor: pointer;
}

@keyframes fileSlideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.file-item:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-item.parsing {
  border-color: var(--color-warning);
  background: rgba(var(--warning-rgb), 0.02);
}

.file-item.ready {
  border-color: var(--color-success);
}

.file-item.failed {
  border-color: var(--color-danger);
  background: rgba(var(--danger-rgb), 0.02);
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.file-status {
  flex-shrink: 0;
}

.status-tag {
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.file-actions {
  flex-shrink: 0;
}

:deep(.el-button--small) {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  font-weight: 600;
}

.panel-content::-webkit-scrollbar,
.files-list::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track,
.files-list::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb,
.files-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.files-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
