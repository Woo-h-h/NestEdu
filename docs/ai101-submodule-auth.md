# AI101 MVP 项目统一登录与认证接入

本模板项目用于创建接入 AI101 主框架的 MVP 项目。iframe 模式下，MVP 项目不自己登录，也不直接向后端换 token，而是通过 `@zcat-open/auth-bridge` 向父窗口主框架请求认证上下文；顶层直访模式下，MVP 项目只使用父框架回跳的一次性 ticket 换取认证 token。

## 1. 安装依赖

本模板已在 `apps/web/package.json` 中接入 `@zcat-open/auth-bridge`。

旧项目手动补装时，优先使用 `npm`：

```bash
npm --prefix apps/web install @zcat-open/auth-bridge
```

如果项目成员习惯使用 `pnpm`，也可以执行：

```bash
pnpm --filter ./apps/web add @zcat-open/auth-bridge
```

如果你已经进入 `apps/web` 目录，也可以直接执行：

```bash
npm install @zcat-open/auth-bridge
```

或：

```bash
pnpm add @zcat-open/auth-bridge
```

## 2. 插件版本迭代记录

当前模板使用 `@zcat-open/auth-bridge@^0.1.6`。新项目直接执行 `npm install @zcat-open/auth-bridge` 即可，不需要在命令里指定版本号。

| 版本 | 接入建议 | 说明 |
| --- | --- | --- |
| `0.1.6` | 当前推荐 | 换票失败默认停在当前页并向页面抛错；换票 API 来源改为静态配置 `VITE_AI101_API_BASE_URL`，不再依赖 URL 上的 `ai101_api_base_url`。 |
| `0.1.5` | 过渡版本 | 本地运行 MVP 项目时不再自动推断 AI101 主平台也在本地；默认仍跳转线上统一登录入口，需要本地主平台联调时再显式配置 `VITE_AI101_LOGIN_ORIGIN`。 |
| `0.1.3` | 可用版本 | 新增 `createAi101SubmoduleAuth`，统一处理 iframe 认证、顶层直访登录和 ticket 换 token。MVP 项目只需要在 `authBridge.ts` 做一次初始化。 |
| `0.1.2` | 过渡版本 | 增加顶层直访 ticket 登录能力，但项目侧仍需要组合底层 API。新项目不要按这个版本手写换票逻辑。 |
| `0.1.1` | 基础版本 | 提供主框架与 MVP 项目之间的 postMessage 认证桥接能力，以及 `buildAuthHeaders` 请求头工具。 |

## 3. 配置父窗口 origin

这里配置的是 **MVP 项目侧信任 AI101 父窗口**，也就是 MVP 项目只接收指定 AI101 主框架 origin 发来的 postMessage。这个配置不等同于把 MVP URL 加到 AI101 主框架白名单。

本模板已在根目录 `.env.example` 中提供配置。新项目起步时直接复制为根目录 `.env`：

```bash
# MVP 项目侧信任的 AI101 父窗口 origin，只填写 AI101 主平台页面 origin。
# 这里不是 AI101 平台侧的 MVP URL 白名单；MVP URL 请在 Agent 工具配置页面填写。
VITE_AI101_PARENT_ORIGINS=https://www.zcat.cn,https://www.kjxhai.cn,https://t.aix101.com,http://localhost:3000
VITE_AI101_CLIENT_NAME=mvp-template
VITE_AI101_DIRECT_AUTH=
VITE_AI101_LOGIN_ORIGIN=https://www.zcat.cn
VITE_AI101_API_BASE_URL=https://api.zcat.cn
VITE_AI101_TICKET_PARAM=ticket
```

内部常用父窗口 origin：

- `https://www.zcat.cn`
- `https://www.kjxhai.cn`
- `https://t.aix101.com`
- `http://localhost:3000`

实际项目可以按部署环境保留需要的 origin。不要配置 `*`，也不要用只包含 hostname 的模糊匹配。

AI101 平台侧允许加载哪些 MVP URL，不需要 MVP 项目开发者修改主框架代码。新 MVP 项目需要先创建 Agent 智能体工具，并在工具配置页面填写 MVP URL；平台会根据这个 MVP URL 自动加入白名单。当前平台只放行域名后缀为 `zcat.cn` 的地址，或本地调试地址 `localhost:端口号`。

## 4. 直访登录兜底

模板同时支持两种访问方式：

- iframe 内访问：通过父框架 postMessage 下发认证上下文。
- 顶层直接访问：没有父窗口时，通过父框架登录页和短期 ticket 完成登录。

顶层直接访问时，模板会按以下顺序处理：

1. 如果本地已有 token，直接使用。
2. 如果 URL 上有 `ticket`，调用固定路由 `/api/public/user/account/login_auto` 换取 token，并清理 URL 中的一次性凭证参数。
3. 如果没有 token 和 `ticket`，跳转到 `VITE_AI101_LOGIN_ORIGIN` 对应的 AI101 统一登录入口，并把当前页面地址作为 `from` 参数带过去。

`VITE_AI101_TICKET_PARAM` 用于配置回跳 URL 上的一次性凭证参数名，默认使用 `ticket`。

换票 API 域名使用 `VITE_AI101_API_BASE_URL` 配置。它是前端静态编译配置，生产包会直接使用这个值；本地开发时 Vite proxy 也复用这个值转发 `login_auto`。回跳 URL 不读取后端域名，只应该携带短期 `ticket`。如果当前 MVP 项目需要由自己的后端换票，可以把 `VITE_AI101_API_BASE_URL` 指向自己的后端，但后端必须实现同一个固定路由 `/api/public/user/account/login_auto`，并接收 `{ ticket }`。

AI101 主框架短期内可能仍会在回跳 URL 中附带 `ai101_api_base_url`，只是为了兼容尚未升级的旧 MVP 项目。新项目和模板代码不要读取、解析或依赖这个参数；后续旧项目完成升级后，该兼容参数会从主框架删除。

新 MVP 项目上线前，需要确认已经在 Agent 智能体工具配置页面填写 MVP URL。平台会自动处理该 URL 的加载白名单和登录回跳白名单；如果 URL 不符合平台域名规则，顶层直访登录会在父框架生成 ticket 前被拦截。

`VITE_AI101_DIRECT_AUTH` 未配置时，本地开发默认关闭，生产环境默认开启。需要本地联调直访登录时，可以显式设置：

```bash
VITE_AI101_DIRECT_AUTH=true
VITE_AI101_LOGIN_ORIGIN=https://www.zcat.cn
VITE_AI101_API_BASE_URL=https://api.zcat.cn
```

不要把真实业务 token 放到 URL 里，URL 里只能放短期 ticket。

## 5. 初始化认证客户端

本模板已内置 `apps/web/src/lib/authBridge.ts`，内部使用 `createAi101SubmoduleAuth` 统一处理 iframe 认证、顶层直访登录和 ticket 换 token。新项目由 Wind 基于模板创建后，按当前模块名调整 `VITE_AI101_CLIENT_NAME` 即可。

```ts
import { authBridge, startAuthBridge } from "@/lib/authBridge";

authBridge.getAuthInfo();
startAuthBridge();
```

约定：

- `VITE_AI101_CLIENT_NAME` 改成当前 MVP 项目名，例如 `knowledge`、`lab`、`contest`。
- `persistToLocalStorage: false` 是默认推荐值，token 只存在内存里。
- 只有明确需要刷新后保持登录状态时，才把 `persistToLocalStorage` 改为 `true`。

## 6. 在应用启动时请求认证

本模板已在 `apps/web/src/main.tsx` 中启动认证桥接：

```ts
import { startAuthBridge } from "@/lib/authBridge";

startAuthBridge().catch((error) => {
  console.warn("Failed to initialize auth bridge", error);
});
```

如果首屏必须等认证后才能请求业务接口，可以在根级状态中等待 `startAuthBridge()` 完成后再渲染业务页面。

## 7. 获取 token / bid / sub

业务代码中通过 `authBridge.getAuthInfo()` 获取认证上下文：

```ts
import { authBridge } from "@/lib/authBridge";

const authInfo = authBridge.getAuthInfo();

console.log(authInfo?.token);
console.log(authInfo?.bid);
console.log(authInfo?.sub);
```

`authInfo.displayNameHint` 若存在，只用于页面展示或 demo 验证，不要作为身份、角色或权限判断依据。需要可信用户详情时，应由 MVP 项目后端或统一后端接口基于 token 返回。

读取顺序由包内部统一处理：

1. 优先读取 MVP 项目 localStorage 中的认证信息
2. localStorage 没有完整认证信息时读取内存
3. MVP 项目启动时仍应通过 `requestAuthInfo({ force: true })` 向父窗口同步最新认证

## 8. 接入 API 请求头

模板项目已在 `apps/web/src/api/client.ts` 的 axios 实例上统一加请求拦截器，不要在页面里手写 token。

```ts
import { authBridge } from "@/lib/authBridge";
import { buildAuthHeaders } from "@zcat-open/auth-bridge";
import axios, { AxiosHeaders } from "axios";

const createApiInstance = () => {
  const instance = axios.create({
    baseURL: settings.api,
    timeout: 30000,
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    const authHeaders = buildAuthHeaders(authBridge.getAuthInfo(), {
      clientName: import.meta.env.VITE_AI101_CLIENT_NAME || "mvp-template",
      platform: "h5",
      version: "1.0.0",
    });

    config.headers = AxiosHeaders.concat(authHeaders, config.headers);
    return config;
  });

  instance.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
  );

  return instance;
};
```

请求头会按当前认证上下文生成：

- `Authorization: Bearer <token>`
- `X-Bid: <bid>`
- `X-Sub: <sub>`
- `X-client: <clientName>`
- `Platform: h5`

## 9. 监听认证变化

如果页面需要响应父框架退出登录、token 刷新或上下文切换，可以订阅认证变化：

```ts
import { authBridge } from "@/lib/authBridge";

const unsubscribe = authBridge.subscribe((authInfo) => {
  if (!authInfo) {
    // 父框架退出登录或认证被清空
    return;
  }

  // token / bid / sub 已更新
});

// 组件卸载或不再需要时调用
unsubscribe();
```

## 10. 安全边界

- MVP 项目只能把 token 当作请求凭证，不要把前端 token 当作最终权限依据。
- 后端鉴权和业务权限判断仍是最终事实来源。
- 不要在业务代码里散落主框架域名，统一使用 `VITE_AI101_PARENT_ORIGINS` 配置。
- 不要把 `allowedOrigins` 配成 `*`。
- 不要在业务页面中直接读写 token localStorage；统一通过 `authBridge` 获取。
- 直访登录只能使用短期 ticket，不要把真实 token 拼到 URL。
- 不要依赖 URL 上的 `ai101_api_base_url`，AI101 API 域名必须来自 `VITE_AI101_API_BASE_URL` 静态配置。
- 父框架后端必须限制 `from` 回跳域名，并保证 ticket 短期、一次性可用。
- 公共 npm 包源码可见，安全必须依赖 origin 校验、后端鉴权和 token 本身的有效性，不能依赖包代码保密。

## 11. MVP 项目接入检查清单

- [ ] 确认 `@zcat-open/auth-bridge` 依赖已安装
- [ ] 配置 `VITE_AI101_PARENT_ORIGINS`
- [ ] 配置 `VITE_AI101_CLIENT_NAME`
- [ ] 如需支持顶层直访，配置 `VITE_AI101_LOGIN_ORIGIN`、`VITE_AI101_API_BASE_URL` 和 `VITE_AI101_TICKET_PARAM`
- [ ] 如需使用 MVP 自有后端换票，将 `VITE_AI101_API_BASE_URL` 指向自有后端，并确认后端实现 `/api/public/user/account/login_auto`
- [ ] 确认 `src/lib/authBridge.ts`
- [ ] 确认应用启动时调用 `startAuthBridge()`
- [ ] 确认 `src/api/client.ts` 统一注入认证请求头
- [ ] 业务页面不直接操作 token localStorage
- [ ] 本地和 iframe 嵌入场景都完成一次接口验证
