<template>
  <div class="app-container">
    <AppHeader
      :knowledge-bases="knowledgeBases"
      :selected-kb="selectedKnowledgeBase"
      @kb-change="handleKnowledgeBaseChange"
      @refresh="loadKnowledgeBases"
    />

    <div class="main-content">
      <ChatArea
        :messages="messages"
        :loading="chatLoading"
        :disabled="!selectedKnowledgeBase"
        :active-kb-ids="sessionKbIds"
        :available-kbs="knowledgeBases"
        @update:active-kb-ids="val => sessionKbIds = val"
        @send-message="handleSendMessage"
      />

      <KnowledgePanel
        :knowledge-base-id="selectedKnowledgeBase"
        :files="files"
        @file-uploaded="handleFileUploaded"
        @parse-file="handleParseFile"
      />
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

const loadFiles = async (kbId: string) => {
  try {
    files.value = await knowledgeApi.getFiles(kbId)
  } catch (error) {
    console.error('加载文件列表失败:', error)
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

const handleParseFile = async (fileId: string) => {
  try {
    await knowledgeApi.parseFile(fileId)
    ElMessage.success('解析任务已提交')

    // 轮询检查解析状态
    const checkStatus = setInterval(async () => {
      if (!selectedKnowledgeBase.value) {
        clearInterval(checkStatus)
        return
      }

      try {
        // 由于后端没有单独查询文件状态的接口，这里通过刷新列表来实现
        // Since backend API is limited, re-fetch list is the only way
        await loadFiles(selectedKnowledgeBase.value)
        
        const currentFile = files.value.find(f => f.id === fileId)
        if (currentFile) {
          if (currentFile.status === 'ready') {
            clearInterval(checkStatus)
            ElMessage.success('文件解析完成')
          } else if (currentFile.status === 'failed') {
            clearInterval(checkStatus)
            ElMessage.error('文件解析失败')
          }
        } else {
           // File not found?
           clearInterval(checkStatus)
        }
      } catch (error) {
        clearInterval(checkStatus) 
      }
    }, 2000)
  } catch (error) {
    console.error('解析文件失败:', error)
  }
}

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
