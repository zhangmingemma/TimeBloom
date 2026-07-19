import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { useEffect, useCallback, useRef } from 'react';
import {
  Bold, Italic, List, ListOrdered, CheckSquare, Palette, ImageIcon,
} from 'lucide-react';

const TEXT_COLORS = [
  '#374151', '#e53e3e', '#ed8936', '#ecc94b',
  '#38a169', '#3182ce', '#805ad5', '#d53f8c',
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const showColorRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
        'data-placeholder': placeholder || '',
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  )
                );
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content]);

  const toggleColorPicker = useCallback(() => {
    showColorRef.current = !showColorRef.current;
    if (colorPickerRef.current) {
      colorPickerRef.current.style.display = showColorRef.current ? 'flex' : 'none';
    }
  }, []);

  const setColor = useCallback((color: string) => {
    editor?.chain().focus().setColor(color).run();
    showColorRef.current = false;
    if (colorPickerRef.current) {
      colorPickerRef.current.style.display = 'none';
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor-wrapper border border-white/50 rounded-lg bg-white/40 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-white/40 bg-white/20 flex-wrap">
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
        >
          <Bold size={12} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <Italic size={12} />
        </ToolbarBtn>
        <div className="w-px h-3.5 bg-gray-300/40 mx-0.5" />
        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          <List size={12} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          <ListOrdered size={12} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checkbox"
        >
          <CheckSquare size={12} />
        </ToolbarBtn>
        <div className="w-px h-3.5 bg-gray-300/40 mx-0.5" />
        <div className="relative">
          <ToolbarBtn active={false} onClick={toggleColorPicker} title="文字颜色">
            <Palette size={12} />
          </ToolbarBtn>
          <div
            ref={colorPickerRef}
            className="absolute top-full left-0 mt-1 p-1.5 bg-white rounded-lg shadow-lg border border-gray-200/60 gap-1 z-50 hidden"
            style={{ display: 'none' }}
          >
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <ToolbarBtn
          active={false}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const src = ev.target?.result as string;
                  editor.chain().focus().setImage({ src }).run();
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }}
          title="插入图片"
        >
          <ImageIcon size={12} />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <div className="px-3 py-2 min-h-[60px] max-h-[120px] overflow-y-auto text-xs text-gray-800 leading-relaxed">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, title, children }: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'text-gray-500/70 hover:bg-white/50 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
