<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo-section">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          </svg>
        </div>
        <h1 class="app-title">RAG Knowledge Hub</h1>
      </div>
    </div>

    <div class="header-right">
      <div class="kb-selector-wrapper">
        <label class="kb-label">知识库</label>
        <el-select :model-value="selectedKb" @update:model-value="$emit('kb-change', $event)" placeholder="选择知识库"
          class="kb-select" size="large">
          <el-option v-for="kb in knowledgeBases" :key="kb.id" :label="kb.name" :value="kb.id">
            <div class="kb-option">
              <span class="kb-option-icon">📚</span>
              <span>{{ kb.name }}</span>
            </div>
          </el-option>
        </el-select>

        <el-button circle plain @click="managerVisible = true" title="管理知识库">
          <el-icon>
            <Setting />
          </el-icon>
        </el-button>
      </div>
    </div>
  </header>

  <KbManager v-model="managerVisible" @refresh="$emit('refresh')" />
</template>

<script setup lang="ts">
import { ref } from 'vue' // Add missing ref import
import type { KnowledgeBase } from '@/types'
import { Setting } from '@element-plus/icons-vue'
import KbManager from './KbManager.vue'

const managerVisible = ref(false)

defineProps<{
  knowledgeBases: KnowledgeBase[]
  selectedKb: string
}>()

defineEmits<{
  'kb-change': [kbId: string]
  'refresh': []
}>()
</script>

<style scoped>
.app-header {
  height: 72px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: relative;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.25);
}

.logo-icon svg {
  width: 22px;
  height: 22px;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
  font-family: var(--font-display);
}

.header-right {
  display: flex;
  align-items: center;
}

.kb-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kb-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.kb-select {
  min-width: 240px;
}

.kb-option {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kb-option-icon {
  font-size: 16px;
}

:deep(.el-select__wrapper) {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 10px;
  box-shadow: none;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}

:deep(.el-select__wrapper:hover) {
  border-color: var(--accent-primary);
}

:deep(.el-select__wrapper.is-focused) {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
}
</style>
