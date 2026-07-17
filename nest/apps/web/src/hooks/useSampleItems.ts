import { useCallback, useEffect, useState } from "react";

import { listSampleItems, type SampleItem } from "@/api";
import { getApiErrorMessage } from "@/lib/apiError";

export function useSampleItems() {
  const [items, setItems] = useState<SampleItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadItems = useCallback(async (): Promise<boolean> => {
    setListLoading(true);
    try {
      const resp = await listSampleItems({ page: 1, limit: 20 });
      if (!resp?.success) {
        setListError("接口返回 success=false");
        return false;
      }

      setItems(resp.result || []);
      setListError(null);
      return true;
    } catch (error) {
      setListError(getApiErrorMessage(error, "加载失败"));
      return false;
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadItems();
    });
  }, [loadItems]);

  return {
    items,
    listLoading,
    listError,
    loadItems,
  };
}
