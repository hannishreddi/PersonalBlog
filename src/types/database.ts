/**
 * Database types for the `public` schema.
 *
 * Generated from the live Supabase project (supabase gen types). Regenerate
 * after every migration instead of editing by hand. Generic helper types from
 * the generator output are omitted because nothing uses them.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: { created_at: string; id: string; name: string; slug: string };
        Insert: { created_at?: string; id?: string; name: string; slug: string };
        Update: { created_at?: string; id?: string; name?: string; slug?: string };
        Relationships: [];
      };
      comments: {
        Row: {
          author_name: string;
          content: string;
          created_at: string;
          id: string;
          post_id: string;
          status: string;
        };
        Insert: {
          author_name: string;
          content: string;
          created_at?: string;
          id?: string;
          post_id: string;
          status?: string;
        };
        Update: {
          author_name?: string;
          content?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_images: {
        Row: { post_id: string; storage_path: string };
        Insert: { post_id: string; storage_path: string };
        Update: { post_id?: string; storage_path?: string };
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_tags: {
        Row: { post_id: string; tag_id: string };
        Insert: { post_id: string; tag_id: string };
        Update: { post_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          category_id: string | null;
          content_markdown: string;
          cover_image_alt: string | null;
          cover_image_height: number | null;
          cover_image_path: string | null;
          cover_image_width: number | null;
          created_at: string;
          excerpt: string;
          id: string;
          published_at: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          content_markdown?: string;
          cover_image_alt?: string | null;
          cover_image_height?: number | null;
          cover_image_path?: string | null;
          cover_image_width?: number | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          content_markdown?: string;
          cover_image_alt?: string | null;
          cover_image_height?: number | null;
          cover_image_path?: string | null;
          cover_image_width?: number | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          reaction_type: string;
          reactor_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          reaction_type?: string;
          reactor_hash: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          reaction_type?: string;
          reactor_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: { created_at: string; id: string; name: string; slug: string };
        Insert: { created_at?: string; id?: string; name: string; slug: string };
        Update: { created_at?: string; id?: string; name?: string; slug?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_post_engagement: {
        Args: { post_ids: string[] };
        Returns: { approved_comment_count: number; post_id: string; reaction_count: number }[];
      };
      get_post_reaction_state: {
        Args: { p_post_id: string; p_reactor: string };
        Returns: { reacted: boolean; reaction_count: number }[];
      };
      is_blog_owner: { Args: never; Returns: boolean };
      set_post_reaction: {
        Args: { p_client: string; p_post_id: string; p_reacted: boolean; p_reactor: string };
        Returns: { outcome: string; reacted: boolean; reaction_count: number }[];
      };
      submit_guest_comment: {
        Args: { p_author_name: string; p_client: string; p_content: string; p_post_id: string };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
