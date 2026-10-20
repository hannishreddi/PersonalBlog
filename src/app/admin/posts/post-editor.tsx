"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ImagePlus } from "lucide-react";

import { ArticleBody } from "@/components/article/article-body";
import type { AdminPost } from "@/lib/admin";
import { formatDate, formatReadingTime } from "@/lib/format";
import { IMAGE_ACCEPT, adminMediaUrl, referencedImagePaths } from "@/lib/images";
import { POST_LIMITS } from "@/lib/post-limits";
import { estimateReadingTime } from "@/lib/reading-time";
import { slugify } from "@/lib/slug";
import { normalizeCategoryName, splitTagNames } from "@/lib/taxonomy";
import type { PostStatus } from "@/types/post";

import {
  savePost,
  type PostField,
  type PostFormValues,
  type PostIntent,
  type SavePostState,
} from "./actions";
import { CoverImageField } from "./cover-image-field";
import { StatusBadge } from "./status-badge";
import { checkImageFile, uploadImage } from "./upload-image";

const inputClass =
  "mt-2 block w-full rounded-xl border border-rule-strong bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-muted aria-invalid:border-accent";
const primaryButton =
  "cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:cursor-wait disabled:opacity-60";
const secondaryButton =
  "cursor-pointer rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised disabled:cursor-wait disabled:opacity-60";

const initialState: SavePostState = { status: "idle", message: null, fieldErrors: {}, saved: null };

type SavedPost = NonNullable<SavePostState["saved"]>;

function toFormValues(post: AdminPost | null): PostFormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    contentMarkdown: post?.contentMarkdown ?? "",
    categoryName: post?.categoryName ?? "",
    tags: post?.tagNames.join(", ") ?? "",
    publishedAt: post?.publishedAt ?? "",
    coverImagePath: post?.coverImagePath ?? "",
    coverImageAlt: post?.coverImageAlt ?? "",
  };
}

/** Text that sits on its own paragraph when inserted at `at`. */
function asBlock(text: string, before: string, after: string): string {
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  return `${lead}${text}${trail}`;
}

interface InlineUpload {
  id: number;
  name: string;
  progress: number;
}

/** Matches uploaded-image Markdown with an empty description: ![](/media/…). */
const IMAGE_WITHOUT_ALT = /!\[\s*\]\(\/media\//g;

/** ISO timestamp -> value for <input type="datetime-local"> in the browser's time zone. */
function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local values have no offset, so `new Date()` reads them as local time. */
function localInputToIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function sameInstant(a: string, b: string): boolean {
  if (!a || !b) return a === b;
  return Date.parse(a) === Date.parse(b);
}

const subscribeNoop = () => () => {};

/** False during server rendering and hydration, true afterwards. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

interface PostEditorProps {
  post: AdminPost | null;
  categorySuggestions: string[];
  tagSuggestions: string[];
}

export function PostEditor({ post, categorySuggestions, tagSuggestions }: PostEditorProps) {
  const [state, formAction, pending] = useActionState(savePost, initialState);
  const isClient = useIsClient();
  const ids = useId();

  const [values, setValues] = useState<PostFormValues>(() => toFormValues(post));
  const [slugTouched, setSlugTouched] = useState(post !== null);
  // null: show the saved publication time; a string: what the owner typed.
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [now] = useState(() => Date.now());

  // Paths uploaded in this editor session. Any the post no longer uses at
  // save time are sent as `discardedUploads` and deleted if unreferenced.
  const [uploads, setUploads] = useState<string[]>([]);
  const [coverBusy, setCoverBusy] = useState(false);
  const [inlineUploads, setInlineUploads] = useState<InlineUpload[]>([]);
  const [inlineMessage, setInlineMessage] = useState<{ text: string; error: boolean } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const nextUploadId = useRef(1);
  const pendingCursor = useRef<number | null>(null);

  const [lastSaved, setLastSaved] = useState<SavedPost | null>(() =>
    post ? { values: toFormValues(post), status: post.status, updatedAt: post.updatedAt } : null,
  );

  // Adopt each successful save (normalized values, new status and version).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.saved) {
      setLastSaved(state.saved);
      setValues(state.saved.values);
      setSlugTouched(true);
      setLocalDate(null);
      // The save kept the uploads it references and cleaned up the rest.
      setUploads([]);
    }
  }

  // Place the cursor after an inserted image once React has applied the text.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (pendingCursor.current === null || !textarea || document.activeElement !== textarea) return;
    textarea.setSelectionRange(pendingCursor.current, pendingCursor.current);
    pendingCursor.current = null;
  }, [values.contentMarkdown]);

  const status: PostStatus = lastSaved?.status ?? "draft";
  const savedValues = lastSaved?.values ?? toFormValues(null);
  const publishedAt = localDate === null ? savedValues.publishedAt : localInputToIso(localDate);
  const dateInputValue = localDate ?? (isClient && savedValues.publishedAt ? isoToLocalInput(savedValues.publishedAt) : "");
  const isFutureDate = publishedAt !== "" && Date.parse(publishedAt) > now;

  const dirty =
    (Object.keys(values) as PostField[]).some((key) => key !== "publishedAt" && values[key] !== savedValues[key]) ||
    !sameInstant(publishedAt, savedValues.publishedAt);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = state.fieldErrors;
  const uploading = coverBusy || inlineUploads.length > 0;

  const referenced = referencedImagePaths(values.coverImagePath || null, values.contentMarkdown);
  const discardedUploads = uploads.filter((path) => !referenced.has(path));
  const imagesWithoutAlt = values.contentMarkdown.match(IMAGE_WITHOUT_ALT)?.length ?? 0;

  async function insertImages(files: File[]) {
    const textarea = textareaRef.current;
    if (!textarea || files.length === 0) return;
    setInlineMessage(null);

    // Reserve each image's place with a placeholder, so typing during the
    // upload doesn't move it. Placeholders are swapped for the final Markdown.
    const jobs = files.slice(0, 10).map((file) => {
      const id = nextUploadId.current++;
      return { file, id, placeholder: `![Uploading ${file.name.replace(/[[\]]/g, "")}…](#upload-${id})` };
    });
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholders = jobs.map((job) => job.placeholder);

    setValues((current) => {
      const before = current.contentMarkdown.slice(0, start);
      const after = current.contentMarkdown.slice(end);
      return { ...current, contentMarkdown: before + asBlock(placeholders.join("\n\n"), before, after) + after };
    });
    setInlineUploads((current) => [...current, ...jobs.map(({ file, id }) => ({ id, name: file.name, progress: 0 }))]);

    const failures: string[] = [];
    await Promise.all(
      jobs.map(async ({ file, id, placeholder }) => {
        try {
          const image = await uploadImage(file, "inline", (progress) =>
            setInlineUploads((current) => current.map((job) => (job.id === id ? { ...job, progress } : job))),
          );
          setUploads((current) => [...current, image.path]);
          setValues((current) => {
            const at = current.contentMarkdown.indexOf(placeholder);
            // The placeholder was deleted while uploading: leave the text alone.
            if (at === -1) return current;
            // Put the cursor inside the brackets, ready to type a description.
            pendingCursor.current = at + 2;
            return { ...current, contentMarkdown: current.contentMarkdown.replace(placeholder, `![](${image.url})`) };
          });
        } catch (error) {
          failures.push(error instanceof Error ? error.message : `“${file.name}” couldn’t be uploaded.`);
          setValues((current) => ({
            ...current,
            contentMarkdown: current.contentMarkdown.replace(placeholder, ""),
          }));
        } finally {
          setInlineUploads((current) => current.filter((job) => job.id !== id));
        }
      }),
    );

    if (failures.length > 0) {
      setInlineMessage({ text: failures.join(" "), error: true });
    } else {
      setInlineMessage({
        text:
          jobs.length === 1
            ? "Image inserted. Type a short description between the square brackets: ![description](…)."
            : `${jobs.length} images inserted. Add a description between the square brackets of each.`,
        error: false,
      });
    }
    if (files.length > jobs.length) {
      setInlineMessage({ text: "Only the first 10 images were uploaded. Add the rest separately.", error: true });
    }
  }

  function imageFiles(list: FileList | null | undefined): File[] {
    return Array.from(list ?? []).filter((file) => file.type.startsWith("image/") || checkImageFile(file) === null);
  }

  function update(field: Exclude<PostField, "publishedAt">, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugTouched) next.slug = slugify(value, POST_LIMITS.slug);
      return next;
    });
  }

  function addTag(name: string) {
    setValues((current) => ({
      ...current,
      tags: current.tags.trim() ? `${current.tags.trim().replace(/,$/, "")}, ${name}` : name,
    }));
  }

  const currentTagSlugs = new Set(
    splitTagNames(values.tags)
      .map((tag) => slugify(tag, POST_LIMITS.tagSlug))
      .filter(Boolean),
  );
  const unusedTags = tagSuggestions.filter((tag) => !currentTagSlugs.has(slugify(tag, POST_LIMITS.tagSlug))).slice(0, 24);

  const fieldProps = (field: PostField) => ({
    id: `${ids}-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": [errors[field] ? `${ids}-${field}-error` : null, `${ids}-${field}-hint`]
      .filter(Boolean)
      .join(" "),
    readOnly: pending,
  });

  const publishLabel = isFutureDate ? "Schedule" : "Publish";

  const buttons: { intent: PostIntent; label: string; primary?: boolean }[] =
    status === "published"
      ? [
          { intent: "save", label: "Update", primary: true },
          { intent: "unpublish", label: "Unpublish" },
          { intent: "archive", label: "Archive" },
        ]
      : status === "archived"
        ? [
            { intent: "save", label: "Save", primary: true },
            { intent: "unpublish", label: "Restore as draft" },
            { intent: "publish", label: publishLabel },
          ]
        : [
            { intent: "save", label: "Save draft" },
            { intent: "publish", label: publishLabel, primary: true },
            ...(lastSaved ? [{ intent: "archive" as const, label: "Archive" }] : []),
          ];

  return (
    <form action={formAction} noValidate className="mt-10">
      {post && <input type="hidden" name="id" value={post.id} />}
      {lastSaved && <input type="hidden" name="expectedUpdatedAt" value={lastSaved.updatedAt} />}
      <input type="hidden" name="publishedAt" value={publishedAt} />
      <input type="hidden" name="coverImagePath" value={values.coverImagePath} />
      <input type="hidden" name="discardedUploads" value={JSON.stringify(discardedUploads)} />

      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <StatusBadge status={status} publishedAt={savedValues.publishedAt || null} now={now} />
        {dirty ? <span>Unsaved changes</span> : lastSaved && <span>All changes saved</span>}
      </div>

      {state.message && !pending && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-6 rounded-xl border px-4 py-3 text-sm text-ink ${
            state.status === "error" ? "border-accent/40 bg-accent-soft" : "border-rule-strong bg-paper-raised"
          }`}
        >
          <span className="font-medium">{state.status === "error" ? "Not saved. " : "Done. "}</span>
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-6">
        <Field label="Title" field="title" ids={ids} error={errors.title}>
          <input
            {...fieldProps("title")}
            name="title"
            required
            maxLength={POST_LIMITS.title}
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            className={`${inputClass} font-serif text-xl`}
          />
        </Field>

        <Field
          label="Slug"
          field="slug"
          ids={ids}
          error={errors.slug}
          hint={
            status === "published" && values.slug !== savedValues.slug
              ? "Changing the slug of a published post breaks existing links to it."
              : `The address of the post: /blog/${values.slug || "…"}`
          }
        >
          <input
            {...fieldProps("slug")}
            name="slug"
            maxLength={POST_LIMITS.slug}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(event.target.value !== "");
              update("slug", event.target.value);
            }}
            className={`${inputClass} font-mono text-sm`}
          />
        </Field>

        <Field
          label="Excerpt"
          field="excerpt"
          ids={ids}
          error={errors.excerpt}
          hint={`Shown on cards and in link previews. ${values.excerpt.length}/${POST_LIMITS.excerpt} characters.`}
        >
          <textarea
            {...fieldProps("excerpt")}
            name="excerpt"
            rows={3}
            maxLength={POST_LIMITS.excerpt}
            value={values.excerpt}
            onChange={(event) => update("excerpt", event.target.value)}
            className={`${inputClass} resize-y`}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Category"
            field="categoryName"
            ids={ids}
            error={errors.categoryName}
            hint="Optional. Pick an existing one or type a new name."
          >
            <input
              {...fieldProps("categoryName")}
              name="categoryName"
              list={`${ids}-categories`}
              maxLength={POST_LIMITS.categoryName}
              value={values.categoryName}
              onChange={(event) => update("categoryName", event.target.value)}
              className={inputClass}
            />
            <datalist id={`${ids}-categories`}>
              {categorySuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>

          <div>
            <label htmlFor={`${ids}-publishedAt`} className="block text-sm font-medium text-ink">
              Publication date
            </label>
            <input
              id={`${ids}-publishedAt`}
              type="datetime-local"
              aria-invalid={errors.publishedAt ? true : undefined}
              aria-describedby={`${errors.publishedAt ? `${ids}-publishedAt-error ` : ""}${ids}-publishedAt-hint`}
              readOnly={pending}
              value={dateInputValue}
              onChange={(event) => setLocalDate(event.target.value)}
              className={inputClass}
            />
            <FieldMessages
              ids={ids}
              field="publishedAt"
              error={errors.publishedAt}
              hint={
                isFutureDate
                  ? "In the future: once published, the post stays hidden until then."
                  : `Optional. Leave empty to use the moment you publish.${
                      isClient ? ` Your time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}.` : ""
                    }`
              }
            />
          </div>
        </div>

        <CoverImageField
          ids={ids}
          path={values.coverImagePath}
          alt={values.coverImageAlt}
          disabled={pending}
          pathError={errors.coverImagePath}
          altError={errors.coverImageAlt}
          onUploaded={(image) => {
            setUploads((current) => [...current, image.path]);
            setValues((current) => ({ ...current, coverImagePath: image.path }));
          }}
          onRemove={() => setValues((current) => ({ ...current, coverImagePath: "", coverImageAlt: "" }))}
          onAltChange={(alt) => update("coverImageAlt", alt)}
          onBusyChange={setCoverBusy}
        />

        <Field
          label="Tags"
          field="tags"
          ids={ids}
          error={errors.tags}
          hint={`Optional. Separate with commas or write them as #hashtags, up to ${POST_LIMITS.tagsPerPost}.`}
        >
          <input
            {...fieldProps("tags")}
            name="tags"
            value={values.tags}
            onChange={(event) => update("tags", event.target.value)}
            className={inputClass}
          />
        </Field>
        {unusedTags.length > 0 && (
          <div className="-mt-3">
            <p id={`${ids}-tag-suggestions`} className="text-xs text-ink-muted">
              Existing tags:
            </p>
            <ul aria-labelledby={`${ids}-tag-suggestions`} className="mt-2 flex flex-wrap gap-2">
              {unusedTags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => addTag(tag)}
                    aria-label={`Add tag ${tag}`}
                    className="cursor-pointer rounded-full border border-rule px-3 py-1 text-xs text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
                  >
                    + {tag}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-end justify-between gap-4">
            <label htmlFor={`${ids}-contentMarkdown`} className="block text-sm font-medium text-ink">
              Article <span className="font-normal text-ink-muted">(Markdown)</span>
            </label>
            <div className="flex gap-1 rounded-full border border-rule p-1" role="group" aria-label="Editor view">
              {(["write", "preview"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={tab === view}
                  onClick={() => setTab(view)}
                  className="cursor-pointer rounded-full px-4 py-1.5 text-sm text-ink-soft capitalize transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {tab === "write" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const files = imageFiles(event.target.files);
                  event.target.value = "";
                  void insertImages(files);
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-4 py-1.5 text-sm text-ink transition-colors hover:border-ink hover:bg-paper-raised disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus aria-hidden="true" className="size-4" />
                Insert image
              </button>
              <span className="text-xs text-ink-muted">At the cursor. You can also paste or drop images into the text.</span>
            </div>
          )}

          {/* The textarea stays mounted (hidden) in preview so its value is still submitted. */}
          <textarea
            {...fieldProps("contentMarkdown")}
            ref={textareaRef}
            name="contentMarkdown"
            hidden={tab !== "write"}
            rows={24}
            maxLength={POST_LIMITS.content}
            value={values.contentMarkdown}
            onChange={(event) => update("contentMarkdown", event.target.value)}
            onPaste={(event) => {
              const files = imageFiles(event.clipboardData.files);
              if (files.length === 0 || pending) return;
              event.preventDefault();
              void insertImages(files);
            }}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes("Files")) event.preventDefault();
            }}
            onDrop={(event) => {
              const files = imageFiles(event.dataTransfer.files);
              if (files.length === 0 || pending) return;
              event.preventDefault();
              textareaRef.current?.focus();
              void insertImages(files);
            }}
            className={`${inputClass} min-h-[24rem] resize-y font-mono text-sm leading-relaxed`}
          />
          <div role="status" className="text-sm">
            {inlineUploads.map((job) => (
              <p key={job.id} className="mt-2 text-ink-muted">
                Uploading {job.name}… {Math.round(job.progress * 100)}%
              </p>
            ))}
          </div>
          {inlineMessage && (
            <p
              role={inlineMessage.error ? "alert" : undefined}
              className={`mt-2 text-sm ${inlineMessage.error ? "font-medium text-accent" : "text-ink-muted"}`}
            >
              {inlineMessage.text}
            </p>
          )}
          {tab === "preview" && <Preview values={values} publishedAt={publishedAt} />}
          <FieldMessages
            ids={ids}
            field="contentMarkdown"
            error={errors.contentMarkdown}
            hint={`${formatReadingTime(estimateReadingTime(values.contentMarkdown))} · ${values.contentMarkdown.length.toLocaleString("en")} characters. Raw HTML is shown as text, not rendered.${
              imagesWithoutAlt > 0
                ? ` ${imagesWithoutAlt === 1 ? "1 image has" : `${imagesWithoutAlt} images have`} no description yet.`
                : ""
            }`}
          />
        </div>
      </div>

      <div className="sticky bottom-0 mt-10 flex flex-wrap items-center gap-3 border-t border-rule bg-paper py-5">
        {buttons.map(({ intent, label, primary }) => (
          <button
            key={intent}
            type="submit"
            name="intent"
            value={intent}
            disabled={pending || uploading}
            className={primary ? primaryButton : secondaryButton}
          >
            {label}
          </button>
        ))}
        <span role="status" className="text-sm text-ink-muted">
          {pending ? "Saving…" : uploading ? "Waiting for uploads to finish…" : ""}
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  field,
  ids,
  error,
  hint,
  children,
}: {
  label: string;
  field: PostField;
  ids: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`${ids}-${field}`} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      <FieldMessages ids={ids} field={field} error={error} hint={hint} />
    </div>
  );
}

function FieldMessages({ ids, field, error, hint }: { ids: string; field: PostField; error?: string; hint?: string }) {
  return (
    <>
      {error && (
        <p id={`${ids}-${field}-error`} className="mt-2 text-sm font-medium text-accent">
          {error}
        </p>
      )}
      <p id={`${ids}-${field}-hint`} className="mt-2 text-xs text-ink-muted">
        {hint}
      </p>
    </>
  );
}

/** The article as readers will see it, using the public renderer. */
function Preview({ values, publishedAt }: { values: PostFormValues; publishedAt: string }) {
  const tags = [...new Set(splitTagNames(values.tags))];
  const categoryName = normalizeCategoryName(values.categoryName);

  return (
    <div
      aria-label="Article preview"
      role="region"
      className="mt-2 rounded-2xl border border-rule bg-paper px-5 py-8 sm:px-8 sm:py-10"
    >
      {categoryName && (
        <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">{categoryName}</p>
      )}
      <p className="mt-4 font-serif text-[2rem] leading-[1.08] tracking-[-0.02em] text-balance text-ink sm:text-[2.6rem]">
        {values.title || <span className="text-ink-muted">Untitled</span>}
      </p>
      {values.excerpt && (
        <p className="mt-5 font-serif text-xl leading-relaxed text-pretty text-ink-soft italic">{values.excerpt}</p>
      )}
      <p className="mt-6 border-y border-rule py-3 text-sm text-ink-muted">
        {publishedAt ? formatDate(publishedAt) : "Date set when published"} ·{" "}
        {formatReadingTime(estimateReadingTime(values.contentMarkdown))}
      </p>
      {values.coverImagePath && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-paper-sunk">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={adminMediaUrl(values.coverImagePath)}
            alt={values.coverImageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      <div className="mt-8">
        {values.contentMarkdown.trim() ? (
          <ArticleBody markdown={values.contentMarkdown} preview />
        ) : (
          <p className="text-ink-muted">Nothing written yet.</p>
        )}
      </div>
      {tags.length > 0 && (
        <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full border border-rule px-3 py-1 text-xs tracking-wide text-ink-muted">
              #{tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
