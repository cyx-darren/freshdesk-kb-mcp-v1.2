import React, { useState, useCallback } from 'react'
import { SketchPicker } from 'react-color'
import TableOfContents from './TableOfContents.jsx'

const RichTextToolbar = ({ editor }) => {
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [showSizeMenu, setShowSizeMenu] = useState(false)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showAlignMenu, setShowAlignMenu] = useState(false)
  const [showListMenu, setShowListMenu] = useState(false)
  const [showSourceCode, setShowSourceCode] = useState(false)

  const fontFamilies = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  ]

  const fontSizes = [
    { name: '8pt', value: '8pt' },
    { name: '9pt', value: '9pt' },
    { name: '10pt', value: '10pt' },
    { name: '11pt', value: '11pt' },
    { name: '12pt', value: '12pt' },
    { name: '14pt', value: '14pt' },
    { name: '16pt', value: '16pt' },
    { name: '18pt', value: '18pt' },
    { name: '20pt', value: '20pt' },
    { name: '24pt', value: '24pt' },
    { name: '28pt', value: '28pt' },
    { name: '32pt', value: '32pt' },
    { name: '36pt', value: '36pt' },
    { name: '48pt', value: '48pt' },
    { name: '72pt', value: '72pt' },
  ]

  const headingLevels = [
    { name: 'Normal', action: () => editor.chain().focus().setParagraph().run() },
    { name: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { name: 'Heading 4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run() },
    { name: 'Heading 5', action: () => editor.chain().focus().toggleHeading({ level: 5 }).run() },
    { name: 'Heading 6', action: () => editor.chain().focus().toggleHeading({ level: 6 }).run() },
  ]

  if (!editor) return null

  const insertLink = useCallback(() => {
    const url = window.prompt('Enter the URL:')
    if (url) {
      const text = window.prompt('Enter the link text (optional):')
      if (text) {
        editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${text}</a>`).run()
      } else {
        editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
      }
    }
  }, [editor])

  const insertImage = useCallback(() => {
    const url = window.prompt('Enter the image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const insertCodeBlock = useCallback(() => {
    editor.chain().focus().toggleCodeBlock().run()
  }, [editor])

  const insertHorizontalRule = useCallback(() => {
    editor.chain().focus().setHorizontalRule().run()
  }, [editor])

  const clearFormatting = useCallback(() => {
    editor.chain().focus().unsetAllMarks().clearNodes().run()
  }, [editor])

  const toggleFullscreen = useCallback(() => {
    const editorElement = document.querySelector('.article-editor')
    if (editorElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        editorElement.requestFullscreen()
      }
    }
  }, [])

  const toggleSourceCode = useCallback(() => {
    setShowSourceCode(!showSourceCode)
    // This would be handled by the parent component
    if (window.toggleSourceView) {
      window.toggleSourceView()
    }
  }, [showSourceCode])

  const DropdownMenu = ({ show, onClose, children, title }) => {
    if (!show) return null
    
    return (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-40">
        <div className="p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <span className="text-xs font-medium text-gray-600">{title}</span>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }

  const ColorPicker = ({ show, onClose, onColorChange, currentColor }) => {
    if (!show) return null
    
    return (
      <div className="absolute top-full left-0 mt-1 z-50">
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative">
          <SketchPicker
            color={currentColor}
            onChange={(color) => onColorChange(color.hex)}
            disableAlpha={true}
            presetColors={[
              '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
              '#FF0000', '#FF6600', '#FFCC00', '#33FF00', '#00FFFF', '#0066FF',
              '#6600FF', '#FF00FF', '#FF3366', '#66FF66', '#3366FF', '#FF6666'
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="p-3">
        <div className="flex items-center space-x-1 flex-wrap gap-1">
          
          {/* Font Family */}
          <div className="relative">
            <button
              onClick={() => setShowFontMenu(!showFontMenu)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 min-w-24"
              title="Font Family"
            >
              <span>Arial</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <DropdownMenu show={showFontMenu} onClose={() => setShowFontMenu(false)} title="Font Family">
              {fontFamilies.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    // Note: This requires custom extension for font family
                    setShowFontMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 font-family"
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </button>
              ))}
            </DropdownMenu>
          </div>

          {/* Font Size */}
          <div className="relative">
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 min-w-16"
              title="Font Size"
            >
              <span>12pt</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <DropdownMenu show={showSizeMenu} onClose={() => setShowSizeMenu(false)} title="Font Size">
              {fontSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    // Note: This requires custom extension for font size
                    setShowSizeMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  style={{ fontSize: size.value }}
                >
                  {size.name}
                </button>
              ))}
            </DropdownMenu>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Paragraph Styles */}
          <div className="relative">
            <button
              onClick={() => setShowHeadingMenu(!showHeadingMenu)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              title="Paragraph Style"
            >
              <span>Normal</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <DropdownMenu show={showHeadingMenu} onClose={() => setShowHeadingMenu(false)} title="Paragraph Style">
              {headingLevels.map((level, index) => (
                <button
                  key={index}
                  onClick={() => {
                    level.action()
                    setShowHeadingMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  {level.name}
                </button>
              ))}
            </DropdownMenu>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Text Formatting */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('underline') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('strike') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Text Color */}
          <div className="relative">
            <button
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Text Color"
            >
              <span className="flex items-center gap-1">
                A
                <div className="w-3 h-1 bg-black rounded-full"></div>
              </span>
            </button>
            
            <ColorPicker
              show={showTextColorPicker}
              onClose={() => setShowTextColorPicker(false)}
              onColorChange={(color) => {
                editor.chain().focus().setColor(color).run()
                setShowTextColorPicker(false)
              }}
              currentColor="#000000"
            />
          </div>

          {/* Background Color */}
          <div className="relative">
            <button
              onClick={() => setShowBgColorPicker(!showBgColorPicker)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Background Color"
            >
              <span className="flex items-center gap-1">
                🎨
              </span>
            </button>
            
            <ColorPicker
              show={showBgColorPicker}
              onClose={() => setShowBgColorPicker(false)}
              onColorChange={(color) => {
                editor.chain().focus().toggleHighlight({ color }).run()
                setShowBgColorPicker(false)
              }}
              currentColor="#ffff00"
            />
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Superscript/Subscript */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={`px-2 py-1.5 text-xs rounded transition-all ${editor.isActive('superscript') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Superscript"
            >
              X²
            </button>
            <button
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={`px-2 py-1.5 text-xs rounded transition-all ${editor.isActive('subscript') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Subscript"
            >
              X₂
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Text Alignment */}
          <div className="relative">
            <button
              onClick={() => setShowAlignMenu(!showAlignMenu)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              title="Text Alignment"
            >
              ⬛
            </button>
            
            <DropdownMenu show={showAlignMenu} onClose={() => setShowAlignMenu(false)} title="Text Alignment">
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('left').run()
                  setShowAlignMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                ⬅️ Align Left
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('center').run()
                  setShowAlignMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                ⬛ Align Center
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('right').run()
                  setShowAlignMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                ➡️ Align Right
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('justify').run()
                  setShowAlignMenu(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                ⬛ Justify
              </button>
            </DropdownMenu>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Lists */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Bullet List"
            >
              • 
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Numbered List"
            >
              1.
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('taskList') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Task List"
            >
              ☑️
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Indentation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100"
              title="Decrease Indent"
            >
              ⬅️
            </button>
            <button
              onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100"
              title="Increase Indent"
            >
              ➡️
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Media & Objects */}
          <div className="flex items-center space-x-1">
            <button
              onClick={insertLink}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              title="Insert Link"
            >
              🔗
            </button>
            <button
              onClick={insertImage}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-green-50 hover:text-green-700"
              title="Insert Image"
            >
              🖼️
            </button>
            <button
              onClick={insertTable}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              title="Insert Table"
            >
              📊
            </button>
            <button
              onClick={insertCodeBlock}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('codeBlock') ? 'bg-gray-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Code Block"
            >
              &lt;/&gt;
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Additional Tools */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`px-2 py-1.5 text-sm rounded transition-all ${editor.isActive('blockquote') ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Quote"
            >
              "
            </button>
            <button
              onClick={insertHorizontalRule}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100"
              title="Horizontal Line"
            >
              ➖
            </button>
            <TableOfContents 
              editor={editor} 
              onInsert={() => {/* TOC inserted */}} 
            />
            <button
              onClick={clearFormatting}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-red-50 hover:text-red-700"
              title="Clear Formatting"
            >
              🧹
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />

          {/* View Options */}
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleSourceCode}
              className={`px-2 py-1.5 text-sm rounded transition-all ${showSourceCode ? 'bg-gray-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Source Code View"
            >
              &lt;/&gt;
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-2 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100"
              title="Toggle Fullscreen (F11)"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RichTextToolbar 