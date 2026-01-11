import axios from 'axios'
import type { KnowledgeBase, FileItem, ChatRequest, ChatResponse } from '@/types'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000
})

const API_BASE_URL = '/api/v1'


interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// Response interceptor unwraps the response to return ApiResponse<T>
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // metadata is often nested in error.config
    // Allow skipping global error message
    if (!error.config?.skipErrorHandler) {
      ElMessage.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

interface BackendDocument {
  id: number
  collection: string
  name: string
  size: number
  status: 'UPLOADED' | 'INDEXED' | 'FAILED'
  createdAt: string
}

export const knowledgeApi = {
  getList: async (): Promise<KnowledgeBase[]> => {
    // Axios response is intercepted, so it returns ApiResponse directly
    const res = await api.get<any, ApiResponse<string[]>>('/docs/collections')
    const collections = res.data || []
    return collections.map((name) => ({
      id: name,
      name: name === 'default' ? '默认知识库' : name, // Better naming
      description: 'RAG 知识库',
      fileCount: 0,
      createTime: new Date().toISOString()
    }))
  },

  createKb: async (name: string): Promise<void> => {
    await api.post<any, ApiResponse<void>>('/docs/kb', null, {
      params: { name }
    })
  },

  deleteKb: async (name: string): Promise<void> => {
    await api.delete<any, ApiResponse<void>>('/docs/kb', {
      params: { name }
    })
  },

  uploadFile: async (knowledgeBaseId: string, file: File): Promise<FileItem> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('collection', knowledgeBaseId)

    interface UploadResp {
      docId: number
      fileName: string
      status: string
    }
    const res = await api.post<any, ApiResponse<UploadResp>>('/docs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipErrorHandler: true
    } as any)
    const doc = res.data
    return {
      id: String(doc.docId),
      name: doc.fileName,
      size: file.size,
      status: doc.status === 'INDEXED' ? 'ready' : (doc.status === 'FAILED' ? 'failed' : 'uploaded'),
      uploadTime: new Date().toISOString()
    }
  },

  getFiles: async (knowledgeBaseId: string, page = 1, size = 10): Promise<{ list: FileItem[], total: number }> => {
    interface PageResp<T> {
      total: number
      page: number
      size: number
      list: T[]
    }

    const res = await api.get<any, ApiResponse<PageResp<BackendDocument>>>('/docs/list', {
      params: {
        collection: knowledgeBaseId,
        page,
        size
      }
    })

    // Data might be PageResp object
    const pageData = res.data
    const docs = pageData.list || []

    const list = docs.map((doc) => {
      let status: FileItem['status'] = 'uploaded'
      if (doc.status === 'INDEXED') status = 'ready'
      if (doc.status === 'FAILED') status = 'failed'

      return {
        id: String(doc.id),
        name: doc.name,
        size: doc.size || 0,
        status,
        uploadTime: doc.createdAt
      }
    })

    return {
      list,
      total: pageData.total
    }
  },

  parseFile: async (fileId: string): Promise<void> => {
    await api.post<any, ApiResponse<void>>(`/docs/${fileId}/index`)
  },

  getFileStatus: async (fileId: string): Promise<FileItem> => {
    // Dummy returning check to avoid lint error 'fileId declared but never read'
    console.log('Checking status for', fileId)
    return Promise.reject('Not implemented, use getFiles list refresh')
  },

  getFilePreviewUrl: (fileId: string): string => {
    return `/api/v1/docs/${fileId}/preview`
  },

  getFileContent: async (fileId: string): Promise<Blob> => {
    // We need the raw response or data as blob. 
    // The interceptor returns response.data
    const res = await api.get(`/docs/${fileId}/preview`, {
      responseType: 'blob',
    })
    return res as unknown as Blob
  }
}

interface BackendCitation {
  docId: number
  docName: string
  chunkId: number
  score: number;
  snippet: string;
}

interface QueryResp {
  answer: string;
  citations: BackendCitation[];
}

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const payload = {
      collection: request.knowledgeBaseId || (request.knowledgeBaseIds?.[0] || 'default'),
      collectionIds: request.knowledgeBaseIds,
      question: request.message
    }
    const res = await api.post<any, ApiResponse<QueryResp>>('/chat/query', payload)
    const data = res.data
    return {
      message: data.answer,
      sources: data.citations?.map((c) => ({
        fileName: c.docName,
        content: c.snippet,
        similarity: c.score,
        page: 1
      })) || []
    }
  },

  sendMessageStream: (
    request: ChatRequest,
    onMessage: (chunk: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ) => {
    const payload = {
      collection: request.knowledgeBaseId || (request.knowledgeBaseIds?.[0] || 'default'),
      collectionIds: request.knowledgeBaseIds,
      question: request.message
    }

    const controller = new AbortController()

    fetch(API_BASE_URL + '/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(response => {
      if (!response.ok) {
        throw new Error('Stream request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''
      let currentDataLines: string[] = []

      const flushEvent = () => {
        if (!currentEvent) {
          currentDataLines = []
          return false
        }

        const data = currentDataLines.join('\n')

        if (currentEvent === 'message') {
          if (data) {
            onMessage(data)
          }
        } else if (currentEvent === 'done') {
          onDone()
          return true
        } else if (currentEvent === 'error') {
          onError(data)
          return true
        }

        currentEvent = ''
        currentDataLines = []
        return false
      }

      function read(): any {
        return reader?.read().then(({ done, value }) => {
          if (done) {
            if (flushEvent()) {
              return
            }
            onDone()
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || ''

          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '')

            if (line === '') {
              if (flushEvent()) {
                return
              }
              continue
            }

            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
              let data = line.substring(5)
              if (data.startsWith(' ')) {
                data = data.slice(1)
              }
              currentDataLines.push(data)
            }
          }

          return read()
        })
      }

      read().catch((error) => {
        if (controller.signal.aborted) return
        onError(error.message || 'Stream read failed')
      })
    }).catch(error => {
      if (controller.signal.aborted || error?.name === 'AbortError') return
      onError(error.message)
    })

    return {
      abort: () => controller.abort()
    }
  }
}
