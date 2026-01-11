export interface KnowledgeBase {
  id: string
  name: string
}

export interface FileItem {
  id: string
  name: string
  size: number
  status: 'uploaded' | 'parsing' | 'ready' | 'failed'
  uploadTime: string
}

export interface Source {
  fileName: string
  content: string
  page?: number
  similarity?: number
}

export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  sources?: Source[]
}

export interface ChatRequest {
  knowledgeBaseId: string
  message: string
}

export interface ChatResponse {
  message: string
  sources?: Source[]
}
