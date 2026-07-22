export type GrowthCategory = '专业研究成果' | '获奖与荣誉' | '学习与研修'

export interface GrowthFileMeta {
  name: string
  type: string
  size: number
}

export interface GrowthRecord {
  id: string
  name: string
  year: number
  category: GrowthCategory
  subtype: string
  date: string
  level: string
  role: string
  org: string
  intro: string
  keywords: string[]
  status: string
  representative: boolean
  extra: Record<string, string>
  files: GrowthFileMeta[]
  createdAt: string
  updatedAt: string
}

export type GrowthRecordInput = Omit<GrowthRecord, 'createdAt' | 'updatedAt'>

export interface GrowthFilters {
  year: string
  category: string
  level: string
  status: string
  keyword: string
}

export type GrowthViewMode = 'cards' | 'timeline'

export interface GrowthListResponse {
  success: boolean
  result: GrowthRecord[]
}

export interface GrowthItemResponse {
  success: boolean
  result: GrowthRecord
}
