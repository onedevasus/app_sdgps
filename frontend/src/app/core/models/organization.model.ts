export interface Organization {
  id: string;  // Django UUIDField retourne une string
  code: string;
  name: string;
  type: string;
  type_display: string;
  legal_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  parent?: string | null;  // UUID ou null
  full_path?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  created_by_email?: string;
  modified_by_email?: string;
  is_test_data?: boolean;
}
