export interface Approval {
  id: number;
  type: "course" | "news";
  title: string;
  description: string;
  requested_by: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  rejectionReason?: string;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}
