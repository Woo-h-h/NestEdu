/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_KNOWLEDGE_ID?: string
  readonly VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID?: string
  readonly VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY?: string
  readonly VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_ID?: string
  readonly VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_KEY?: string
  readonly VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID?: string
  readonly VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY?: string
  readonly VITE_PLATFORM_API_BASE_URL?: string
  readonly VITE_PLATFORM_REFERER?: string
  readonly VITE_TEACHING_AGENT_ID?: string
  readonly VITE_WEEKLY_PLAN_AGENT_ID?: string
  readonly VITE_PROFILE_AGENT_ID?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_BUILD_ID?: string
  readonly VITE_USE_BACKEND_API?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
