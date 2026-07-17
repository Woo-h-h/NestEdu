export interface GLOBAL_AUTH_INFO {
  token: string;
  bid: string;
  sub: string;
}

export interface IFrameMessage {
  type: string;
  data: Record<string, any>;
}