"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "./toggle";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Tamil bodies get the Tamil face and looser leading. */
  lang?: "en" | "ta";
  className?: string;
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b p-1.5">
      <Toggle
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Toggle
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        label="Subheading"
      >
        <Heading2 className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        label="Minor heading"
      >
        <Heading3 className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Toggle
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        label="Quote"
      >
        <Quote className="size-4" />
      </Toggle>
      <Toggle
        pressed={editor.isActive("link")}
        onPressedChange={setLink}
        label="Link"
      >
        <LinkIcon className="size-4" />
      </Toggle>

      <div className="ml-auto flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  lang = "en",
  className,
}: Props) {
  const editor = useEditor({
    // Tiptap renders on the client only; without this Next warns on hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write the story...",
      }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-content min-h-[320px] px-4 py-3",
          lang === "ta" && "font-tamil",
        ),
        lang,
      },
    },
  });

  if (!editor) {
    return (
      <div className={cn("bg-muted/30 h-[380px] animate-pulse rounded-lg border", className)} />
    );
  }

  return (
    <div className={cn("focus-within:ring-ring/40 overflow-hidden rounded-lg border focus-within:ring-2", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="text-muted-foreground bg-muted/30 flex justify-end border-t px-3 py-1.5 text-xs">
        {editor.storage.characterCount
          ? null
          : `${editor.getText().trim().split(/\s+/).filter(Boolean).length} words`}
      </div>
    </div>
  );
}
