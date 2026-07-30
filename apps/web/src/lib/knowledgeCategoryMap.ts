/**
 * 知识库分类树映射。
 *
 * 重要：以「对象方法」形式导出，避免打包 minify 后顶层短函数名
 *（曾与 React 运行时 Cd/wd/Od/Sd 冲突，导致 array:5 却 mappedCount:0）。
 */

export interface KnowledgeCategoryNode {
  id: string
  name: string
  parentId: string
  key: string
  childrenIds: string[]
}

type CategoryCodec = {
  flatten: (rawList: unknown[]) => KnowledgeCategoryNode[]
  summarize: (rawList: unknown[], limit?: number) => unknown[]
}

function nestEduBuildCategoryCodec(): CategoryCodec {
  const coerce = (item: unknown): Record<string, unknown> | null => {
    if (!item) return null
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>
        }
      } catch {
        return null
      }
      return null
    }
    if (typeof item !== 'object' || Array.isArray(item)) return null
    return item as Record<string, unknown>
  }

  const mapOne = (raw: Record<string, unknown>): KnowledgeCategoryNode | null => {
    const sources: Record<string, unknown>[] = [raw]
    for (const wrap of ['category', 'node', 'item', 'data', 'record', 'info']) {
      const inner = raw[wrap]
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        sources.push(inner as Record<string, unknown>)
      }
    }

    for (const src of sources) {
      // 平台 SPA 字段：id / name / parent_id / children_ids
      const idVal = src.id ?? src.category_id ?? src.categoryId ?? src.value ?? src.folder_id
      const nameVal =
        src.name ??
        src.category_name ??
        src.categoryName ??
        src.title ??
        src.label ??
        src.text ??
        src.folder_name ??
        src.folderName

      if (idVal == null || idVal === '') continue
      if (nameVal == null || nameVal === '') continue

      const parentVal = src.parent_id ?? src.parentId ?? src.pid ?? 0
      const childrenRaw = src.children_ids ?? src.childrenIds ?? src.child_ids
      const childrenIds = Array.isArray(childrenRaw)
        ? childrenRaw
            .map((entry) => {
              if (typeof entry === 'string' || typeof entry === 'number') return String(entry)
              if (entry && typeof entry === 'object') {
                const obj = entry as Record<string, unknown>
                const cid = obj.id ?? obj.category_id ?? obj.categoryId ?? obj.value
                return cid == null ? '' : String(cid)
              }
              return ''
            })
            .filter(Boolean)
        : []

      return {
        id: String(idVal),
        name: String(nameVal),
        parentId: parentVal == null || parentVal === '' ? '0' : String(parentVal),
        key: String(src.category_key ?? src.categoryKey ?? src.custom_key ?? src.key ?? ''),
        childrenIds,
      }
    }
    return null
  }

  return {
    flatten(rawList: unknown[]): KnowledgeCategoryNode[] {
      const byId = new Map<string, KnowledgeCategoryNode>()

      const walk = (items: unknown[], inferredParentId: string) => {
        for (const item of items) {
          const raw = coerce(item)
          if (!raw) continue
          const mapped = mapOne(raw)
          if (!mapped) continue

          if (
            inferredParentId &&
            inferredParentId !== '0' &&
            (!mapped.parentId || mapped.parentId === '0')
          ) {
            mapped.parentId = inferredParentId
          }

          const existing = byId.get(mapped.id)
          if (!existing) {
            byId.set(mapped.id, mapped)
          } else {
            if ((!existing.parentId || existing.parentId === '0') && mapped.parentId !== '0') {
              existing.parentId = mapped.parentId
            }
            if (!existing.key && mapped.key) existing.key = mapped.key
            if (mapped.childrenIds.length > 0) {
              existing.childrenIds = [
                ...new Set([...existing.childrenIds, ...mapped.childrenIds.map(String)]),
              ]
            }
          }

          const nested = Array.isArray(raw.children)
            ? raw.children
            : Array.isArray(raw.childrens)
              ? raw.childrens
              : Array.isArray(raw.child_list)
                ? raw.child_list
                : null
          if (nested) walk(nested, mapped.id)
        }
      }

      walk(rawList, '0')

      for (const node of byId.values()) {
        for (const childId of node.childrenIds) {
          const child = byId.get(String(childId))
          if (child && (!child.parentId || child.parentId === '0')) {
            child.parentId = node.id
          }
        }
      }

      return [...byId.values()]
    },

    summarize(rawList: unknown[], limit = 5): unknown[] {
      return rawList.slice(0, limit).map((item) => {
        if (item == null) return { type: 'null' }
        if (typeof item !== 'object') return { type: typeof item, value: item }
        if (Array.isArray(item)) return { type: 'array', length: item.length }
        const obj = item as Record<string, unknown>
        const preview: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj).slice(0, 20)) {
          if (
            value == null ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            preview[key] = value
          } else if (Array.isArray(value)) {
            preview[key] = `array(${value.length}):${value.slice(0, 8).map(String).join(',')}`
          } else if (typeof value === 'object') {
            preview[key] = `{${Object.keys(value as object).slice(0, 8).join(',')}}`
          } else {
            preview[key] = typeof value
          }
        }
        return { keys: Object.keys(obj), preview }
      })
    },
  }
}

/** 唯一导出入口：请始终通过该对象调用（对象方法不会与 React 顶层短名冲突） */
export const NestEduKnowledgeCategoryCodec = nestEduBuildCategoryCodec()
