export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[]

// Maintained from versioned migrations until CLI type generation is available.
interface Schema {
  public: {
    Tables: {
      profiles: { Row: { id: string; email: string | null; full_name: string | null; role: 'user' | 'admin'; preferred_locale: 'en' | 'fa'; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }; Update: Partial<Database['public']['Tables']['profiles']['Row']> }
      categories: { Row: { id: string; slug: string; name_en: string; name_fa: string; sort_order: number; active: boolean; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['categories']['Row']> & { slug: string; name_en: string; name_fa: string }; Update: Partial<Database['public']['Tables']['categories']['Row']> }
      museum_sections: { Row: { id: string; slug: string; title_en: string; title_fa: string; description_en: string | null; description_fa: string | null; sort_order: number; active: boolean; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['museum_sections']['Row']> & { slug: string; title_en: string; title_fa: string }; Update: Partial<Database['public']['Tables']['museum_sections']['Row']> }
      museum_items: { Row: { id: string; slug: string; title_en: string; title_fa: string; brand: string | null; release_year: number | null; short_description_en: string | null; short_description_fa: string | null; description_en: string | null; description_fa: string | null; category_id: string | null; section_id: string | null; sort_order: number; status: 'draft' | 'published'; featured: boolean; enable_gallery: boolean; enable_ai_curator: boolean; enable_exploded_view: boolean; thumbnail_path: string | null; model_path: string | null; model_original_filename: string | null; model_file_size: number | null; source_platform: string | null; source_url: string | null; creator: string | null; license: string | null; attribution_required: boolean; attribution_text: string | null; created_by: string | null; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['museum_items']['Row']> & { slug: string; title_en: string; title_fa: string }; Update: Partial<Database['public']['Tables']['museum_items']['Row']> }
      museum_item_specs: { Row: { id: string; item_id: string; label_en: string; label_fa: string; value: string; sort_order: number; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['museum_item_specs']['Row']> & { item_id: string; label_en: string; label_fa: string; value: string }; Update: Partial<Database['public']['Tables']['museum_item_specs']['Row']> }
      gallery_images: { Row: { id: string; item_id: string; storage_path: string; caption_en: string | null; caption_fa: string | null; sort_order: number; created_at: string; updated_at: string }; Insert: Partial<Database['public']['Tables']['gallery_images']['Row']> & { item_id: string; storage_path: string }; Update: Partial<Database['public']['Tables']['gallery_images']['Row']> }
    }
    Functions: { save_museum_item: { Args: { item: Json; specs: Json; gallery: Json; expected_updated_at: string | null }; Returns: string } }
  }
}

export type Database = { public: {
  Tables: { [K in keyof Schema['public']['Tables']]: Schema['public']['Tables'][K] & {Relationships: []} };
  Views: Record<never, never>;
  Functions: Schema['public']['Functions'] & {is_admin: {Args: Record<never, never>; Returns: boolean}};
  Enums: Record<never, never>;
  CompositeTypes: Record<never, never>;
}}
export type Row<K extends keyof Database['public']['Tables']> = Database['public']['Tables'][K]['Row']
