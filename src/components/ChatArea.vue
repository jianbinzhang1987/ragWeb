<template>
  <div class="chat-area">
    <!-- Knowledge Base Tags Header -->
    <div class="chat-header">
      <div class="kb-tags-label">当前会话知识库：</div>
      <div class="kb-tags-list">
        <el-tag
          v-for="kb in activeKbs"
          :key="kb.id"
          closable
          effect="light"
          round
          class="kb-tag"
          @close="removeKb(kb.id)"
        >
          {{ kb.name }}
        </el-tag>

        <el-popover
          v-if="unselectedKbs.length > 0"
          v-model:visible="kbSelectorVisible"
          placement="bottom-start"
          :width="200"
          trigger="click"
        >
          <template #reference>
            <el-button class="add-kb-btn" circle size="small">
              <span class="plus-icon">+</span>
            </el-button>
          </template>
          <div class="kb-selector-popover">
            <div class="kb-selector-title">添加知识库</div>
            <el-select
              v-model="selectedKbToAdd"
              placeholder="选择知识库"
              filterable
              size="small"
              class="kb-add-select"
              @change="addKb"
            >
              <el-option
                v-for="kb in unselectedKbs"
                :key="kb.id"
                :label="kb.name"
                :value="kb.id"
              />
            </el-select>
          </div>
        </el-popover>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>开始对话</h3>
        <p>选择知识库，上传文件后即可开始智能问答</p>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="message-wrapper"
        :class="message.type"
      >
        <div class="message-avatar">
          <span v-if="message.type === 'user'">👤</span>
          <span v-else>🤖</span>
          <div
            v-if="message.type === 'ai' && shouldShowInlineLoading(message)"
            class="typing-bubble"
          >
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">
              {{ message.type === 'user' ? '你' : 'AI 助手' }}
            </span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>

          <div class="message-text">
            <div v-if="message.type === 'user'" class="user-text">
              {{ message.content }}
            </div>
            <div v-else class="ai-text" v-html="renderMarkdown(message.content)"></div>
          </div>

          <div v-if="message.sources && message.sources.length > 0" class="sources-section">
            <div class="sources-toggle" @click="toggleSources(message.id)">
              <span class="sources-icon">📎</span>
              <span class="sources-label">引用来源 ({{ message.sources.length }})</span>
              <span class="toggle-icon" :class="{ expanded: expandedSources.has(message.id) }">
                ▼
              </span>
            </div>

            <transition name="sources-expand">
              <div v-if="expandedSources.has(message.id)" class="sources-list">
                <div
                  v-for="(source, index) in message.sources"
                  :key="index"
                  class="source-item"
                >
                  <div class="source-header">
                    <span class="source-file">{{ source.fileName }}</span>
                    <span v-if="source.page" class="source-page">第 {{ source.page }} 页</span>
                    <span v-if="source.similarity" class="source-similarity">
                      {{ Math.round(source.similarity * 100) }}%
                    </span>
                  </div>
                  <div class="source-content">{{ source.content }}</div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- Only show loading when no streaming message exists -->
      <div v-if="loading && !hasStreamingMessage" class="message-wrapper ai">
        <div class="message-avatar">
          <span>🤖</span>
        </div>
        <div class="message-content">
          <div class="loading-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="input-area">
      <div class="input-container">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="1"
          :autosize="{ minRows: 1, maxRows: 6 }"
          placeholder="输入问题... (Enter 发送, Shift+Enter 换行)"
          :disabled="disabled || loading"
          @keydown="handleKeyDown"
          class="message-input"
        />
        <button
          v-if="loading"
          class="pause-button"
          @click="emit('pause-stream')"
        >
          ❚❚
        </button>
        <button
          class="send-button"
          :disabled="disabled || loading || !inputMessage.trim()"
          @click="handleSend"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div v-if="disabled" class="input-hint warning">
        ⚠️ 请先选择知识库
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import type { Message } from '@/types'
import { formatTime } from '@/utils/format'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const props = defineProps<{
  messages: Message[]
  loading: boolean
  disabled: boolean
  activeKbIds: string[]
  availableKbs: any[]
}>()

const emit = defineEmits<{
  'send-message': [content: string]
  'update:active-kb-ids': [ids: string[]]
  'pause-stream': []
}>()

const kbSelectorVisible = ref(false)
const selectedKbToAdd = ref('')

const activeKbs = computed(() => {
  return props.activeKbIds.map(id => 
    props.availableKbs.find(k => k.id === id) || { id, name: id }
  )
})

const unselectedKbs = computed(() => {
  return props.availableKbs.filter(k => !props.activeKbIds.includes(k.id))
})

const removeKb = (id: string) => {
  const newIds = props.activeKbIds.filter(kbId => kbId !== id)
  emit('update:active-kb-ids', newIds)
}

const addKb = () => {
  if (selectedKbToAdd.value) {
    const newIds = [...props.activeKbIds, selectedKbToAdd.value]
    emit('update:active-kb-ids', newIds)
    selectedKbToAdd.value = ''
    kbSelectorVisible.value = false
  }
}

// Check if there's a streaming AI message (empty or partial content while loading)
const hasStreamingMessage = computed(() => {
  if (!props.loading) return false
  const lastMessage = props.messages[props.messages.length - 1]
  return lastMessage && lastMessage.type === 'ai'
})

const lastMessageId = computed(() => {
  return props.messages[props.messages.length - 1]?.id || ''
})

const inputMessage = ref('')
const messagesContainer = ref<HTMLElement>()
const expandedSources = ref(new Set<string>())

const md = new MarkdownIt({
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {}
    }
    return ''
  },
  breaks: true,
  linkify: true
})

const normalizeMarkdown = (content: string) => {
  return content.replace(/^(#{1,6})([^#\s])/gm, '$1 $2')
}

const renderMarkdown = (content: string) => {
  return md.render(normalizeMarkdown(content))
}

const shouldShowInlineLoading = (message: Message) => {
  return props.loading
    && message.type === 'ai'
    && message.id === lastMessageId.value
}

const toggleSources = (messageId: string) => {
  if (expandedSources.value.has(messageId)) {
    expandedSources.value.delete(messageId)
  } else {
    expandedSources.value.add(messageId)
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  const message = inputMessage.value.trim()
  if (message && !props.disabled && !props.loading) {
    emit('send-message', message)
    inputMessage.value = ''
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, () => {
  scrollToBottom()
})

watch(() => props.loading, () => {
  scrollToBottom()
})

watch(() => props.messages[props.messages.length - 1]?.content, () => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.chat-header {
  padding: 12px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.kb-tags-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.kb-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.kb-tag {
  border-color: var(--accent-primary) !important;
  color: var(--accent-primary) !important;
  background: rgba(var(--accent-rgb), 0.08) !important;
}

.add-kb-btn {
  width: 24px;
  height: 24px;
  min-height: 24px;
  padding: 0;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.add-kb-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(var(--accent-rgb), 0.05);
}

.kb-selector-popover {
  padding: 8px;
}

.kb-selector-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.kb-add-select {
  width: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  scroll-behavior: smooth;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  opacity: 0.6;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  filter: grayscale(0.3);
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  font-family: var(--font-display);
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.message-wrapper {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  animation: messageSlideIn 0.3s ease;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  position: relative;
}

.message-wrapper.ai .message-avatar {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border: none;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.message-sender {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.message-time {
  font-size: 13px;
  color: var(--text-tertiary);
}

.message-text {
  line-height: 1.7;
  font-size: 15px;
}

.user-text {
  color: var(--text-primary);
  font-family: var(--font-body);
}

.ai-text {
  color: var(--text-primary);
  font-family: var(--font-body);
  line-height: 1.7;
}

.typing-bubble {
  position: absolute;
  right: -10px;
  bottom: -8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  z-index: 2;
}

.typing-bubble .dot {
  width: 4px;
  height: 4px;
}

.ai-text :deep(p) {
  margin: 0 0 12px 0;
  line-height: 1.7;
}

.ai-text :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-text :deep(br) {
  display: block;
  content: "";
  margin-top: 8px;
}

.ai-text :deep(ul),
.ai-text :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.ai-text :deep(li) {
  margin: 4px 0;
  line-height: 1.6;
}

.ai-text :deep(h1),
.ai-text :deep(h2),
.ai-text :deep(h3),
.ai-text :deep(h4) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.4;
}

.ai-text :deep(blockquote) {
  border-left: 4px solid var(--accent-primary);
  margin: 12px 0;
  padding: 8px 16px;
  background: var(--bg-hover);
  border-radius: 4px;
}

.ai-text :deep(code) {
  background: var(--bg-code);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--text-code);
}

.ai-text :deep(pre) {
  background: var(--bg-code);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  white-space: pre;
}

.ai-text :deep(pre code) {
  background: none;
  padding: 0;
  color: var(--text-code);
  white-space: pre;
}

.sources-section {
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.sources-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.sources-toggle:hover {
  background: var(--bg-hover);
}

.sources-icon {
  font-size: 14px;
}

.sources-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  flex: 1;
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.sources-expand-enter-active,
.sources-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.sources-expand-enter-from,
.sources-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.sources-expand-enter-to,
.sources-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

.sources-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
}

.source-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.source-file {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary);
  flex: 1;
}

.source-page,
.source-similarity {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-tag);
  padding: 2px 8px;
  border-radius: 4px;
}

.source-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
}

.loading-indicator {
  display: flex;
  gap: 6px;
  padding: 12px 0;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  border-radius: 50%;
  animation: dotPulse 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-area {
  border-top: 1px solid var(--border-color);
  background: var(--bg-surface);
  padding: 20px 32px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
}

:deep(.el-textarea__inner) {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  font-family: var(--font-body);
  resize: none;
  transition: all 0.2s ease;
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
}

:deep(.el-textarea__inner::placeholder) {
  color: var(--text-tertiary);
}

.send-button {
  width: 44px;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pause-button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 14px;
  letter-spacing: 1px;
}

.pause-button:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(var(--accent-rgb), 0.05);
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.4);
}

.send-button:active:not(:disabled) {
  transform: translateY(0);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-button svg {
  width: 20px;
  height: 20px;
}

.input-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.input-hint.warning {
  color: var(--color-warning);
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
