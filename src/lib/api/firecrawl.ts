import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export const firecrawlApi = {
  async scrape(url: string, options?: { formats?: string[]; onlyMainContent?: boolean }): Promise<FirecrawlResponse> {
    const { data, error } = await invokeEdgeFunction('firecrawl-scrape', {
      body: { url, options },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },
};
