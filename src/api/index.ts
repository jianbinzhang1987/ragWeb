import axios from 'axios'
import type { KnowledgeBase, FileItem, ChatRequest, ChatResponse } from '@/types'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000
})

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

  getFiles: async (knowledgeBaseId: string): Promise<FileItem[]> => {
    const res = await api.get<any, ApiResponse<BackendDocument[]>>('/docs/list', {
      params: { collection: knowledgeBaseId }
    })
    const docs = res.data || []
    return docs.map((doc) => {
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
  },

  parseFile: async (fileId: string): Promise<void> => {
    await api.post<any, ApiResponse<void>>(`/docs/${fileId}/index`)
  },

  getFileStatus: async (fileId: string): Promise<FileItem> => {
    // Dummy returning check to avoid lint error 'fileId declared but never read'
    console.log('Checking status for', fileId)
    return Promise.reject('Not implemented, use getFiles list refresh')
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
  }
}
