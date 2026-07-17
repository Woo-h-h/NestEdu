import {
  authBridge,
  listenToParentMessages,
  postMessageToParent,
  sendPageDataStatus as sendBridgePageDataStatus,
} from "@/lib/authBridge";
import type { AuthInfo } from "@zcat-open/auth-bridge";
import type { IFrameMessage, GLOBAL_AUTH_INFO } from "./type";

// Token管理
let globalAuthInfo: GLOBAL_AUTH_INFO | null = null;

// 用户常用的与主项目通讯的方法
/**
 * 获取全局token
 */
export const getGlobalToken = (): string | undefined => {
  return getGlobalAuthInfo()?.token;
};

export const getGlobalAuthInfo = (): {
  token: string;
  bid: string;
  sub: string;
} | null => {
  const authInfo = authBridge.getAuthInfo();
  if (authInfo?.token) {
    return normalizeGlobalAuthInfo(authInfo);
  }

  return globalAuthInfo;
};

/**
 * 检查是否有token
 */
export const hasToken = (): boolean => {
  return !!getGlobalAuthInfo()?.token;
};

/**
 * 发送页面数据状态给父窗口
 */
export const sendPageDataStatus = (hasData: boolean) => {
  sendBridgePageDataStatus(hasData);
};
/**
 * 向父窗口发送消息
 */
export const sendMessageToParent = (message: IFrameMessage) => {
  postMessageToParent(message);
};






/**
 * 下述都为获取token逻辑，项目已自动内置好
 */
export const connectTokenWitchParent = () => {
  authBridge.start();

  const currentAuthInfo = authBridge.getAuthInfo();
  if (currentAuthInfo?.token) {
    setGlobalToken(normalizeGlobalAuthInfo(currentAuthInfo));
  }

  const unsubscribe = authBridge.subscribe((authInfo) => {
    if (authInfo?.token) {
      setGlobalToken(normalizeGlobalAuthInfo(authInfo));
      return;
    }

    globalAuthInfo = null;
  });

  authBridge.requestAuthInfo({ force: true }).catch((error) => {
    console.warn("Failed to request auth info from parent.", error);
  });

  return () => {
    unsubscribe();
  };
}

/**
 * 设置全局token
 */
const setGlobalToken = (userInfo: {
  token: string;
  bid: string;
  sub: string;
}) => {
  globalAuthInfo = userInfo;
};

const normalizeGlobalAuthInfo = (authInfo: AuthInfo): GLOBAL_AUTH_INFO => {
  return {
    token: authInfo.token,
    bid: authInfo.bid ? String(authInfo.bid) : "",
    sub: authInfo.sub ? String(authInfo.sub) : "",
  };
};

export { listenToParentMessages };
