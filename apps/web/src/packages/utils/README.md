# Utils 工具包

## Communication 通信模块

`communication` 封装 AI101 iframe 子模块常用通信方法，底层使用 `@zcat-open/auth-bridge`。

```ts
import {
  connectTokenWitchParent,
  getGlobalAuthInfo,
  getGlobalToken,
  hasToken,
  listenToParentMessages,
  sendMessageToParent,
  sendPageDataStatus,
} from "@/packages/utils/communication";

const cleanupAuth = connectTokenWitchParent();
const authInfo = getGlobalAuthInfo();
const token = getGlobalToken();
const ready = hasToken();

sendPageDataStatus(true);

sendMessageToParent({
  type: "CUSTOM_MESSAGE",
  data: { value: 1 },
});

const cleanupMessages = listenToParentMessages((message) => {
  console.log(message.type, message.data);
});

cleanupMessages();
cleanupAuth();
```
