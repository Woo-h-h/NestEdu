## 1. 后端

- [x] 1.1 `model/growth_record.go` + Payload DTO
- [x] 1.2 `store/growth_store.go` CRUD + 可选筛选
- [x] 1.3 `service/growth_service.go` 校验与 JSON 转换
- [x] 1.4 `http/growth_handlers.go` 路由注册
- [x] 1.5 `DomainModels` + router 接线
- [x] 1.6 sqlite 内存单测

## 2. 前端

- [x] 2.1 `types/growth.ts` + `lib/growthCategories.ts`
- [x] 2.2 `api/growth.ts` BFF + localStorage
- [x] 2.3 `hooks/useGrowthRecords.ts`
- [x] 2.4 成果库列表页（统计/筛选/卡片/时间轴）
- [x] 2.5 `/archive/upload` 三步录入 + 编辑
- [x] 2.6 `ArchiveDetailDrawer` 详情
- [x] 2.7 路由与首页计数

## 3. 验证

- [x] 3.1 `cd apps/api && go test ./...`
- [x] 3.2 `pnpm --filter ./apps/web build`
