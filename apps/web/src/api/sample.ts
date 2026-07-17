import { request } from "./client";

export interface SampleItem {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ListSampleItemsResult {
  success: boolean;
  result: SampleItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSampleItemPayload {
  name: string;
  description?: string;
}

export interface UpdateSampleItemPayload {
  name: string;
  description?: string;
}

export function listSampleItems(params: { page?: number; limit?: number } = {}) {
  return request.get<ListSampleItemsResult>("/api/v1/sample/items", { params });
}

export function createSampleItem(payload: CreateSampleItemPayload) {
  return request.post("/api/v1/sample/items", payload);
}

export function updateSampleItem(id: number, payload: UpdateSampleItemPayload) {
  return request.put(`/api/v1/sample/items/${id}`, payload);
}

export function deleteSampleItem(id: number) {
  return request.delete(`/api/v1/sample/items/${id}`);
}
