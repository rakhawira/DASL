import { getNews } from "@/services/api";
import { useState } from "react";

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  publish_date?: string;
  publishDate?: string;
  is_active?: boolean;
  isActive?: boolean;
}

export const useNews = (limit?: number | null) => {
  const [news, setNews] = useState<NewsItem[]>([]);

  const loadNews = async () => {
    try {
      const params: { page: number; limit?: number } = { page: 1 };
      // Only include limit if it's a valid number
      if (limit !== null && limit !== undefined && limit > 0) {
        params.limit = limit;
      }
      const response = await getNews(params);
      setNews(response.data || []);
    } catch (error) {
      console.error("Error loading news:", error);
    }
  };

  return { news, loadNews };
};
