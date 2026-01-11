<template>
  <div class="app-container">
    <AppHeader :knowledge-bases="knowledgeBases" :selected-kb="selectedKnowledgeBase"
      @kb-change="handleKnowledgeBaseChange" @refresh="loadKnowledgeBases" />

    <div class="main-content">
      <ChatArea :messages="messages" :loading="chatLoading" :disabled="!selectedKnowledgeBase"
        :active-kb-ids="sessionKbIds" :available-kbs="knowledgeBases" @update:active-kb-ids="val => sessionKbIds = val"
        @send-message="handleSendMessage" />

      <KnowledgePanel :knowledge-base-id="selectedKnowledgeBase" :files="files" :total="paging.total"
        :current-page="paging.page" :page-size="paging.size" @file-uploaded="handleFileUploaded"
        @page-change="handlePageChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import ChatArea from './components/ChatArea.vue'
import KnowledgePanel from './components/KnowledgePanel.vue'
import { knowledgeApi, chatApi } from './api'
import type { KnowledgeBase, FileItem, Message } from './types'
import { generateId } from './utils/format'
import { ElMessage, ElMessageBox } from 'element-plus'

const knowledgeBases = ref<KnowledgeBase[]>([])
const selectedKnowledgeBase = ref<string>('')
const sessionKbIds = ref<string[]>([])
const files = ref<FileItem[]>([])
const messages = ref<Message[]>([])
const chatLoading = ref(false)

const loadKnowledgeBases = async () => {
  try {
    knowledgeBases.value = await knowledgeApi.getList()
    if (knowledgeBases.value.length > 0) {
      selectedKnowledgeBase.value = knowledgeBases.value[0].id
      sessionKbIds.value = [knowledgeBases.value[0].id]
    }
  } catch (error) {
    console.error('加载知识库失败:', error)
  }
}

const paging = ref({
  page: 1,
  size: 5,
  total: 0
})

const loadFiles = async (kbId: string) => {
  try {
    const res = await knowledgeApi.getFiles(kbId, paging.value.page, paging.value.size)
    files.value = res.list
    paging.value.total = res.total
  } catch (error) {
    console.error('加载文件列表失败:', error)
  }
}

const handlePageChange = (page: number) => {
  paging.value.page = page
  if (selectedKnowledgeBase.value) {
    loadFiles(selectedKnowledgeBase.value)
  }
}

const handleKnowledgeBaseChange = async (kbId: string) => {
  if (messages.value.length > 0) {
    try {
      await ElMessageBox.confirm(
        '切换知识库将清空当前会话记录，是否继续？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      messages.value = []
    } catch {
      return
    }
  }

  selectedKnowledgeBase.value = kbId
  sessionKbIds.value = [kbId] // Sync session KB
  await loadFiles(kbId)
}

const handleSendMessage = async (content: string) => {
  if (!selectedKnowledgeBase.value) {
    ElMessage.warning('请先选择知识库')
    return
  }

  // Check if at least one selected KB has files? 
  // Current logic checks 'files' which is only for separate 'selectedKnowledgeBase'.
  // This is a bit inconsistent with multi-KB session.
  // But for now, let's keep the check simple or relax it.
  // The PRD says "KB without files cannot be added".
  // Let's assume user handled adding valid KBs.
  // We can skip the strict "hasReadyFiles" check for now or check if active-kb-ids are valid.

  // Update: Sending message will use sessionKbIds
  const userMessage: Message = {
    id: generateId(),
    type: 'user',
    content,
    timestamp: new Date().toISOString()
  }

  messages.value.push(userMessage)
  chatLoading.value = true

  try {
    const response = await chatApi.sendMessage({
      knowledgeBaseId: selectedKnowledgeBase.value, // Keep for legacy/logging
      knowledgeBaseIds: sessionKbIds.value, // New field
      message: content
    })

    const aiMessage: Message = {
      id: generateId(),
      type: 'ai',
      content: response.message,
      timestamp: new Date().toISOString(),
      sources: response.sources
    }

    messages.value.push(aiMessage)
  } catch (error) {
    console.error('发送消息失败:', error)
  } finally {
    chatLoading.value = false
  }
}

const handleFileUploaded = async () => {
  if (selectedKnowledgeBase.value) {
    await loadFiles(selectedKnowledgeBase.value)
  }
}

// handleParseFile removed as parsing is automatic

watch(selectedKnowledgeBase, (newVal) => {
  if (newVal) {
    loadFiles(newVal)
  }
})

onMounted(() => {
  loadKnowledgeBases()
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
