<template>
    <el-dialog v-model="visible" :title="fileName" width="80%" :fullscreen="fullscreen" class="preview-dialog"
        destroy-on-close @close="handleClose">
        <div class="preview-content" :style="{ height: fullscreen ? 'calc(100vh - 120px)' : '60vh' }"
            v-loading="loading">
            <!-- 文本/Markdown/代码 -->
            <div v-if="isText" class="text-viewer">
                <div v-if="fileType === 'md'" v-html="renderMarkdown(textContent)" class="markdown-body"></div>
                <pre v-else class="code-block"><code>{{ textContent }}</code></pre>
            </div>

            <!-- 图片 -->
            <div v-else-if="isImage" class="image-viewer">
                <img :src="fileUrl" alt="preview" />
            </div>

            <!-- PDF -->
            <div v-else-if="isPdf" class="pdf-viewer">
                <iframe :src="fileUrl" width="100%" height="100%"></iframe>
            </div>

            <!-- HTML (e.g. from Docx) -->
            <div v-else-if="htmlContent" class="html-viewer" v-html="htmlContent"></div>

            <!-- Excel/CSV (Simple table) -->
            <div v-else-if="isCsv" class="csv-viewer">
                <el-table :data="csvData" border height="500">
                    <el-table-column v-for="(col, index) in csvHeaders" :key="index" :prop="col" :label="col" />
                </el-table>
            </div>

            <!-- 不支持的格式 -->
            <div v-else class="unsupported-viewer">
                <div class="icon">📦</div>
                <p>暂不支持预览该格式文件</p>
                <el-button type="primary" @click="downloadFile">下载文件</el-button>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="toggleFullscreen">{{ fullscreen ? '退出全屏' : '全屏' }}</el-button>
                <el-button type="primary" @click="downloadFile">下载</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { knowledgeApi } from '@/api'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import mammoth from 'mammoth'
import { ElMessage } from 'element-plus'

const props = defineProps<{
    modelValue: boolean
    fileId: string
    fileName: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const fullscreen = ref(true)
const textContent = ref('')
const htmlContent = ref('')
const fileUrl = ref('')
const csvData = ref<any[]>([])
const csvHeaders = ref<string[]>([])

const md = new MarkdownIt()

const fileType = computed(() => {
    const name = props.fileName.toLowerCase()
    const ext = name.split('.').pop() || ''
    return ext
})

const isText = computed(() => ['txt', 'md', 'json', 'js', 'css', 'java', 'py', 'yml', 'xml'].includes(fileType.value))
const isImage = computed(() => ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(fileType.value))
const isPdf = computed(() => fileType.value === 'pdf')
const isDocx = computed(() => fileType.value === 'docx')
const isCsv = computed(() => fileType.value === 'csv')

const renderMarkdown = (text: string) => {
    return md.render(text)
}

const loadContent = async () => {
    if (!props.fileId) return
    loading.value = true
    textContent.value = ''
    htmlContent.value = ''
    fileUrl.value = ''
    csvData.value = []

    try {
        if (isText.value || isCsv.value) {
            const blob = await knowledgeApi.getFileContent(props.fileId)
            const text = await blob.text()
            if (isCsv.value) {
                parseCsv(text)
            } else {
                textContent.value = text
            }
        } else if (isDocx.value) {
            const blob = await knowledgeApi.getFileContent(props.fileId)
            const arrayBuffer = await blob.arrayBuffer()
            const result = await mammoth.convertToHtml({ arrayBuffer })
            htmlContent.value = result.value
        } else {
            // PDF, Image, etc. use URL
            // We use the direct API URL which returns the stream
            fileUrl.value = knowledgeApi.getFilePreviewUrl(props.fileId)
        }
    } catch (error) {
        console.error('Preview error:', error)
        ElMessage.error('无法预览文件')
    } finally {
        loading.value = false
    }
}

const parseCsv = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
        csvHeaders.value = lines[0].split(',')
        csvData.value = lines.slice(1).map(line => {
            const values = line.split(',')
            const obj: any = {}
            csvHeaders.value.forEach((header, index) => {
                obj[header] = values[index]
            })
            return obj
        })
    }
}

const handleClose = () => {
    // Reset state if needed
}

const downloadFile = async () => {
    try {
        const blob = await knowledgeApi.getFileContent(props.fileId)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = props.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    } catch (error) {
        console.error('Download failed:', error)
        ElMessage.error('下载失败')
    }
}

const toggleFullscreen = () => {
    fullscreen.value = !fullscreen.value
}

watch(() => props.modelValue, (val) => {
    if (val) {
        loadContent()
    }
})
</script>

<style scoped>
.preview-content {
    min-height: 400px;
    height: 60vh;
    overflow-y: auto;
    display: flex;
    justify-content: center;
}

:deep(.el-dialog.is-fullscreen) .preview-content {
    height: calc(100vh - 150px);
}

.text-viewer,
.markdown-body,
.code-block {
    width: 100%;
    text-align: left;
    white-space: pre-wrap;
    font-family: monospace;
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    overflow: auto;
}

.markdown-body {
    white-space: normal;
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif;
    background: transparent;
}

.image-viewer img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.pdf-viewer {
    width: 100%;
    height: 100%;
}

.html-viewer {
    width: 100%;
    padding: 24px;
    background: white;
}

.unsupported-viewer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
}

.unsupported-viewer .icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
}
</style>
