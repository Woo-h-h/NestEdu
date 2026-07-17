# API 契约（MVP Template 示例）

## 通用响应格式

### 成功

```json
{
  "success": true,
  "status": "ok",
  "result": {}
}
```

### 失败

```json
{
  "success": false,
  "errorCode": 400,
  "errorMessage": "xxx"
}
```

## 示例接口

### 1) 健康检查

- `GET /healthz`

响应：

```json
{
  "success": true,
  "status": "ok",
  "result": {
    "status": "ok"
  }
}
```

### 2) 获取 Sample 列表

- `GET /api/v1/sample/items?page=1&limit=20`

响应字段：
- `result`: `SampleItem[]`
- `total`: 总数
- `page`: 当前页
- `limit`: 每页条数

### 3) 新增 Sample 项

- `POST /api/v1/sample/items`

请求体：

```json
{
  "name": "Demo Item",
  "description": "用于演示模板"
}
```

约束：
- `name` 必填

### 4) 修改 Sample 项

- `PUT /api/v1/sample/items/:id`

请求体：

```json
{
  "name": "Updated Item",
  "description": "更新后的描述"
}
```

约束：
- `name` 必填
- 记录不存在时返回 404

### 5) 删除 Sample 项

- `DELETE /api/v1/sample/items/:id`

响应：

```json
{
  "success": true,
  "status": "ok",
  "result": {
    "deleted": true
  }
}
```

约束：
- 记录不存在时返回 404
