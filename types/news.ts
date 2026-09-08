export interface News {
  id: string;
  title: string;
  content: string;
  category: "announcement" | "event" | "news" | "academic";
  author: string;
  publish_date: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNews {
  title: string;
  content: string;
  category: "announcement" | "event" | "news" | "academic";
  author: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  is_active?: boolean;
}

export interface UpdateNews {
  title?: string;
  content?: string;
  category?: "announcement" | "event" | "news" | "academic";
  author?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  is_active?: boolean;
}

export interface NewsCategory {
  value: string;
  label: {
    EN: string;
    ID: string;
  };
}
