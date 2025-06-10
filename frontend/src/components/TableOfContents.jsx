import React, { useState, useEffect } from 'react'

const TableOfContents = ({ editor, onInsert }) => {
  const [headings, setHeadings] = useState([])
  const [showTOC, setShowTOC] = useState(false)

  useEffect(() => {
    if (!editor) return

    const updateHeadings = () => {
      const headings = []
      const doc = editor.state.doc

      doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const id = `heading-${pos}`
          headings.push({
            level: node.attrs.level,
            text: node.textContent,
            id,
            pos
          })
        }
      })

      setHeadings(headings)
    }

    // Update headings when content changes
    editor.on('update', updateHeadings)
    updateHeadings() // Initial update

    return () => {
      // TipTap uses off() to remove event listeners
      editor.off('update', updateHeadings)
    }
  }, [editor])

  const generateTOC = () => {
    if (headings.length === 0) {
      alert('No headings found in the document. Add some headings first!')
      return
    }

    let tocHTML = '<div class="table-of-contents">\n'
    tocHTML += '<h3>Table of Contents</h3>\n'
    tocHTML += '<ul>\n'

    headings.forEach((heading) => {
      const indent = '  '.repeat(heading.level - 1)
      tocHTML += `${indent}<li><a href="#${heading.id}">${heading.text}</a></li>\n`
    })

    tocHTML += '</ul>\n'
    tocHTML += '</div>\n\n'

    // Insert TOC at the beginning of the document
    editor.chain().focus().insertContentAt(0, tocHTML).run()
    onInsert()
  }

  const scrollToHeading = (pos) => {
    // This would scroll to the heading in a real implementation
    editor.chain().focus().setTextSelection(pos).run()
  }

  if (!editor) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowTOC(!showTOC)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
        title="Table of Contents"
      >
        📋 TOC
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showTOC && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-64">
          <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <span className="text-xs font-medium text-gray-600">Table of Contents</span>
          </div>
          
          <div className="p-3">
            <button
              onClick={generateTOC}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 mb-3"
            >
              📋 Generate TOC
            </button>

            {headings.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <div className="text-xs text-gray-500 mb-2">Current Headings:</div>
                {headings.map((heading, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToHeading(heading.pos)}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded flex items-center"
                    style={{ paddingLeft: `${heading.level * 8 + 8}px` }}
                  >
                    <span className="text-gray-400 mr-2">H{heading.level}</span>
                    <span className="truncate">{heading.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-4">
                No headings found.<br />
                Add headings to generate TOC.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TableOfContents 