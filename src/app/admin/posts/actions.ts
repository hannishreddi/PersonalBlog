"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isPostStatus } from "@/lib/admin";
import { requireOwner } from "@/lib/auth";
import { IMAGE_BUCKET, MAX_ALT_LENGTH, parseImagePath, referencedImagePaths } from "@/lib/images";
import { POST_LIMITS } from "@/lib/post-limits";
import { POSTS_CACHE_TAG } from "@/lib/posts";
import { isValidSlug, slugify } from "@/lib/slug";
import { createSessionClient } from "@/lib/supabase/server";
import type { PostStatus } from "@/types/post";

/*
 * Post management. Server Actions are public endpoints: each one calls
 * requireOwner() before reading input, validates everything with Zod, and
 * writes with the owner's session so RLS checks ownership again in the
 * database. Nothing the browser sends about status, ownership, or timestamps
 * is trusted beyond the validated fields below.
 *
 * Timestamp rules:
 *   - created_at / updated_at are set by the database (default + trigger).
 *   - published_at is the publication time chosen in the editor. A post that
 *     ends up `published` without one is stamped with the current time. A
 *     published post with a future published_at is "scheduled": RLS keeps it
 *     hidden from readers until that moment.
 *   - Unpublishing or archiving keeps published_at, so republishing restores
 *     the original date unless the owner changes it.
 *
 * Images: the cover is a storage path chosen from an earlier upload
 * (POST /admin/images); inline images are `/media/<path>` references in the
 * Markdown. A database trigger records both in post_images, which decides
 * what readers may load. After a successful save or delete, images the post
 * no longer uses are deleted from storage, but only if no other post
 * references them.
 */

export type PostIntent = "save" | "publish" | "unpublish" | "archive";

export interface PostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  categoryName: string;
  /** Comma-separated tag names. */
  tags: string;
  /** ISO 8601, or "" for none. */
  publishedAt: string;
  /** Storage path of the cover image, or "" for none. */
  coverImagePath: string;
  coverImageAlt: string;
}

export type PostField = keyof PostFormValues;

export interface SavePostState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<PostField, string>>;
  /** The post as stored after the last successful save. */
  saved: { values: PostFormValues; status: PostStatus; updatedAt: string } | null;
}

const POST_FIELDS: Record<PostField, true> = {
  title: true,
  slug: true,
  excerpt: true,
  contentMarkdown: true,
  categoryName: true,
  tags: true,
  publishedAt: true,
  coverImagePath: true,
  coverImageAlt: true,
};

const postFormSchema = z.object({
  id: z.uuid().nullable(),
  expectedUpdatedAt: z.string().min(1).max(64).nullable(),
  intent: z.enum(["save", "publish", "unpublish", "archive"]),
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(POST_LIMITS.title, `Keep the title under ${POST_LIMITS.title} characters.`),
  slug: z.string().trim().max(POST_LIMITS.slug, `Keep the slug under ${POST_LIMITS.slug} characters.`),
  excerpt: z
    .string()
    .trim()
    .max(POST_LIMITS.excerpt, `Keep the excerpt under ${POST_LIMITS.excerpt} characters.`),
  contentMarkdown: z
    .string()
    .max(POST_LIMITS.content, `The article is longer than ${POST_LIMITS.content.toLocaleString("en")} characters.`),
  categoryName: z
    .string()
    .trim()
    .max(POST_LIMITS.categoryName, `Keep the category under ${POST_LIMITS.categoryName} characters.`),
  tags: z.string().max(2000, "Too many tags."),
  publishedAt: z.union([z.literal(""), z.iso.datetime({ offset: true, error: "Enter a valid date and time." })]),
  coverImagePath: z.union([
    z.literal(""),
    z
      .string()
      .refine((path) => parseImagePath(path)?.kind === "covers", "That cover image isn’t valid. Upload it again."),
  ]),
  coverImageAlt: z
    .string()
    .trim()
    .max(MAX_ALT_LENGTH, `Keep the description under ${MAX_ALT_LENGTH} characters.`),
  /** Paths uploaded in this editor session that the post no longer uses. */
  discardedUploads: z.array(z.string().max(300)).max(50),
});

function parseJsonArray(raw: string): unknown {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return null;
  }
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function optionalText(formData: FormData, name: string): string | null {
  return text(formData, name) || null;
}

function errorState(message: string, fieldErrors: SavePostState["fieldErrors"] = {}): SavePostState {
  return { status: "error", message, fieldErrors, saved: null };
}

interface TagInput {
  name: string;
  slug: string;
}

/** Splits "a, b, c", collapses whitespace, and drops duplicates by slug. */
function parseTags(raw: string): { tags: TagInput[] } | { error: string } {
  const tags = new Map<string, TagInput>();
  for (const part of raw.split(",")) {
    const name = part.replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (name.length > POST_LIMITS.tagName) {
      return { error: `Keep each tag under ${POST_LIMITS.tagName} characters.` };
    }
    const slug = slugify(name, POST_LIMITS.tagSlug);
    if (!slug) return { error: `The tag “${name}” needs at least one letter or number.` };
    if (!tags.has(slug)) tags.set(slug, { name, slug });
  }
  if (tags.size > POST_LIMITS.tagsPerPost) {
    return { error: `Use at most ${POST_LIMITS.tagsPerPost} tags.` };
  }
  return { tags: [...tags.values()] };
}

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

/** Storage paths the post currently references (empty if unknown). */
async function currentImageRefs(supabase: SessionClient, postId: string): Promise<string[]> {
  const { data, error } = await supabase.from("post_images").select("storage_path").eq("post_id", postId);
  return error ? [] : data.map((row) => row.storage_path);
}

/**
 * Deletes those of `candidates` that no post references any more. The owner
 * session can read every post_images row, so a file still used by any post,
 * in any status, is kept. Failures only leave unused files behind, so they
 * are not reported. The check and the delete are separate requests; with a
 * single author saving one post at a time, that window is acceptable.
 */
async function removeUnusedImages(supabase: SessionClient, candidates: Iterable<string>): Promise<void> {
  const paths = [...new Set(candidates)].filter((path) => parseImagePath(path) !== null);
  if (paths.length === 0) return;

  const { data, error } = await supabase.from("post_images").select("storage_path").in("storage_path", paths);
  if (error) return;
  const stillUsed = new Set(data.map((row) => row.storage_path));
  const unused = paths.filter((path) => !stillUsed.has(path));
  if (unused.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(unused);
}

/** Returns the category id for a name, creating the category if needed. */
async function resolveCategoryId(supabase: SessionClient, name: string): Promise<string | null> {
  if (!name) return null;
  const slug = slugify(name, POST_LIMITS.categorySlug);

  const { error: insertError } = await supabase
    .from("categories")
    .upsert({ slug, name }, { onConflict: "slug", ignoreDuplicates: true });
  if (insertError) throw new Error("category");

  const { data, error } = await supabase.from("categories").select("id").eq("slug", slug).single();
  if (error) throw new Error("category");
  return data.id;
}

/** Returns tag ids for the given tags, creating missing tags. */
async function resolveTagIds(supabase: SessionClient, tags: TagInput[]): Promise<string[]> {
  if (tags.length === 0) return [];

  const { error: insertError } = await supabase
    .from("tags")
    .upsert(tags, { onConflict: "slug", ignoreDuplicates: true });
  if (insertError) throw new Error("tags");

  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .in(
      "slug",
      tags.map((tag) => tag.slug),
    );
  if (error || data.length !== tags.length) throw new Error("tags");
  return data.map((row) => row.id);
}

/**
 * Makes the post's tag links match `tagIds`. Adds before removing, so a
 * failure part-way leaves extra tags rather than silently dropping any.
 */
async function syncPostTags(supabase: SessionClient, postId: string, tagIds: string[]): Promise<boolean> {
  const { data: current, error } = await supabase.from("post_tags").select("tag_id").eq("post_id", postId);
  if (error) return false;

  const currentIds = new Set(current.map((row) => row.tag_id));
  const wanted = new Set(tagIds);
  const toAdd = tagIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wanted.has(id));

  if (toAdd.length > 0) {
    const { error: addError } = await supabase.from("post_tags").upsert(
      toAdd.map((tag_id) => ({ post_id: postId, tag_id })),
      { onConflict: "post_id,tag_id", ignoreDuplicates: true },
    );
    if (addError) return false;
  }
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId)
      .in("tag_id", toRemove);
    if (removeError) return false;
  }
  return true;
}

function nextStatus(intent: PostIntent, current: PostStatus | null): PostStatus {
  switch (intent) {
    case "publish":
      return "published";
    case "unpublish":
      return "draft";
    case "archive":
      return "archived";
    case "save":
      return current ?? "draft";
  }
}

function successMessage(intent: PostIntent, status: PostStatus, publishedAt: string | null): string {
  const scheduled = status === "published" && publishedAt !== null && Date.parse(publishedAt) > Date.now();
  switch (intent) {
    case "publish":
      return scheduled
        ? "Scheduled. Readers won’t see it until its publication time."
        : "Published. It’s now live for readers.";
    case "unpublish":
      return "Unpublished. The post is a draft again and hidden from readers.";
    case "archive":
      return "Archived. The post is hidden from readers.";
    case "save":
      if (status === "published") {
        return scheduled ? "Saved. The post is still scheduled." : "Saved. Your changes are live.";
      }
      return status === "archived" ? "Saved. The post is still archived." : "Draft saved.";
  }
}

export async function savePost(_prev: SavePostState, formData: FormData): Promise<SavePostState> {
  await requireOwner();

  const parsed = postFormSchema.safeParse({
    id: optionalText(formData, "id"),
    expectedUpdatedAt: optionalText(formData, "expectedUpdatedAt"),
    intent: text(formData, "intent") || "save",
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    // Browsers submit textarea line breaks as CRLF; store plain LF.
    excerpt: text(formData, "excerpt").replace(/\r\n?/g, "\n"),
    contentMarkdown: text(formData, "contentMarkdown").replace(/\r\n?/g, "\n"),
    categoryName: text(formData, "categoryName").replace(/\s+/g, " "),
    tags: text(formData, "tags"),
    publishedAt: text(formData, "publishedAt"),
    coverImagePath: text(formData, "coverImagePath"),
    coverImageAlt: text(formData, "coverImageAlt").replace(/\s+/g, " "),
    discardedUploads: parseJsonArray(text(formData, "discardedUploads")),
  });

  if (!parsed.success) {
    const fieldErrors: SavePostState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field in POST_FIELDS && !(field in fieldErrors)) {
        fieldErrors[field as PostField] = issue.message;
      }
    }
    return errorState("Please fix the highlighted fields.", fieldErrors);
  }

  const input = parsed.data;
  const fieldErrors: SavePostState["fieldErrors"] = {};

  const slug = input.slug || slugify(input.title, POST_LIMITS.slug);
  if (!isValidSlug(slug, POST_LIMITS.slug)) {
    fieldErrors.slug = input.slug
      ? "Use lowercase letters, numbers, and single hyphens (e.g. my-first-post)."
      : "Enter a slug. The title has no letters or numbers to build one from.";
  }

  if (input.categoryName && !slugify(input.categoryName, POST_LIMITS.categorySlug)) {
    fieldErrors.categoryName = "The category needs at least one letter or number.";
  }

  const tagResult = parseTags(input.tags);
  if ("error" in tagResult) fieldErrors.tags = tagResult.error;

  if (input.id && !input.expectedUpdatedAt) {
    return errorState("This form is missing version information. Reload the page and try again.");
  }

  const supabase = await createSessionClient();

  // The current row decides what "save" means and guards against stale edits.
  let currentStatus: PostStatus | null = null;
  let currentCover: string | null = null;
  let previousRefs: string[] = [];
  if (input.id) {
    const { data: current, error } = await supabase
      .from("posts")
      .select("status, updated_at, cover_image_path")
      .eq("id", input.id)
      .maybeSingle();
    if (error) return errorState("Couldn’t load the post. Please try again.");
    if (!current || !isPostStatus(current.status)) {
      return errorState("This post no longer exists. It may have been deleted in another tab.");
    }
    currentStatus = current.status;
    currentCover = current.cover_image_path;
    previousRefs = await currentImageRefs(supabase, input.id);
  }

  // A newly chosen cover must be a file that was actually uploaded.
  const cover = input.coverImagePath ? parseImagePath(input.coverImagePath) : null;
  if (cover && cover.path !== currentCover) {
    const { data: exists, error } = await supabase.storage.from(IMAGE_BUCKET).exists(cover.path);
    if (error || !exists) fieldErrors.coverImagePath = "The cover image couldn’t be found. Upload it again.";
  }

  const status = nextStatus(input.intent, currentStatus);

  if (status === "published") {
    if (!input.excerpt) fieldErrors.excerpt = "Add an excerpt before publishing. Readers see it on cards and in link previews.";
    if (!input.contentMarkdown.trim()) fieldErrors.contentMarkdown = "Write the article before publishing.";
  }

  if (Object.keys(fieldErrors).length > 0 || "error" in tagResult) {
    return errorState("Please fix the highlighted fields.", fieldErrors);
  }

  // A validated ISO timestamp is stored as given, so an unchanged date keeps
  // its full database precision.
  const publishedAt = input.publishedAt
    ? input.publishedAt
    : status === "published"
      ? new Date().toISOString()
      : null;

  // Resolve taxonomy first: if it fails, the post itself is untouched.
  let categoryId: string | null;
  let tagIds: string[];
  try {
    categoryId = await resolveCategoryId(supabase, input.categoryName);
    tagIds = await resolveTagIds(supabase, tagResult.tags);
  } catch {
    return errorState("Couldn’t save the category or tags. Nothing was changed; please try again.");
  }

  const row = {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content_markdown: input.contentMarkdown,
    category_id: categoryId,
    status,
    published_at: publishedAt,
    cover_image_path: cover?.path ?? null,
    cover_image_alt: cover ? input.coverImageAlt : null,
    cover_image_width: cover?.width ?? null,
    cover_image_height: cover?.height ?? null,
  };

  const result = input.id
    ? await supabase
        .from("posts")
        .update(row)
        .eq("id", input.id)
        // Optimistic concurrency: only update the version the editor loaded.
        .eq("updated_at", input.expectedUpdatedAt!)
        .select("id, updated_at")
        .maybeSingle()
    : await supabase.from("posts").insert(row).select("id, updated_at").single();

  if (result.error) {
    if (result.error.code === "23505") {
      return errorState("Please fix the highlighted fields.", { slug: "Another post already uses this slug." });
    }
    return errorState("Couldn’t save the post. Please check the fields and try again.");
  }
  if (!result.data) {
    return errorState(
      "This post was changed somewhere else (perhaps another tab) since you opened it. Copy any unsaved text, then reload the page to get the latest version.",
    );
  }

  const postId = result.data.id;
  const tagsSynced = await syncPostTags(supabase, postId, tagIds);

  const nowReferenced = referencedImagePaths(row.cover_image_path, row.content_markdown);
  await removeUnusedImages(supabase, [
    ...previousRefs.filter((path) => !nowReferenced.has(path)),
    ...input.discardedUploads.filter((path) => !nowReferenced.has(path)),
  ]);

  // Public pages read through the "posts" cache tag; refresh them now.
  updateTag(POSTS_CACHE_TAG);

  if (!input.id) {
    redirect(`/admin/posts/${postId}?notice=${tagsSynced ? "created" : "tags-failed"}`);
  }

  const values: PostFormValues = {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    contentMarkdown: input.contentMarkdown,
    categoryName: input.categoryName,
    tags: tagResult.tags.map((tag) => tag.name).join(", "),
    publishedAt: publishedAt ?? "",
    coverImagePath: cover?.path ?? "",
    coverImageAlt: cover ? input.coverImageAlt : "",
  };
  const saved = { values, status, updatedAt: result.data.updated_at };

  if (!tagsSynced) {
    return {
      status: "error",
      message: "The post was saved, but its tags couldn’t be updated. Save again to retry.",
      fieldErrors: {},
      saved,
    };
  }

  return { status: "success", message: successMessage(input.intent, status, publishedAt), fieldErrors: {}, saved };
}

export interface DeletePostState {
  error: string | null;
}

export async function deletePost(_prev: DeletePostState, formData: FormData): Promise<DeletePostState> {
  await requireOwner();

  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) return { error: "That post couldn’t be identified. Reload the page and try again." };

  const supabase = await createSessionClient();
  const imageRefs = await currentImageRefs(supabase, parsed.data);
  // Comments, reactions, tag links, and image references are removed by
  // ON DELETE CASCADE.
  const { error } = await supabase.from("posts").delete().eq("id", parsed.data);
  if (error) return { error: "Couldn’t delete the post. Please try again." };

  // The post's images go too, unless another post still uses them.
  await removeUnusedImages(supabase, imageRefs);

  updateTag(POSTS_CACHE_TAG);
  redirect("/admin?notice=deleted");
}
