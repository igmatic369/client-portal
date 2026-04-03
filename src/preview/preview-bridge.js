;(function () {
  // Only activate in preview mode
  if (new URLSearchParams(window.location.search).get('preview') !== 'true') return

  // ── Utilities ──────────────────────────────────────────────────────────────

  function getNestedValue(obj, path) {
    return path.split('.').reduce(function (acc, k) {
      return acc != null ? acc[k] : undefined
    }, obj)
  }

  // ── CSS Injection ──────────────────────────────────────────────────────────

  var style = document.createElement('style')
  style.textContent = [
    '[data-content-key] {',
    '  cursor: pointer !important;',
    '  position: relative;',
    '}',
    '[data-content-key]:hover {',
    '  outline: 2px solid rgba(59,130,246,0.55) !important;',
    '  outline-offset: 2px;',
    '}',
    '.__preview-pencil {',
    '  position: absolute;',
    '  top: -10px;',
    '  right: -10px;',
    '  background: #3b82f6;',
    '  color: #fff;',
    '  border-radius: 50%;',
    '  width: 20px;',
    '  height: 20px;',
    '  font-size: 11px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  pointer-events: none;',
    '  z-index: 9999;',
    '  line-height: 1;',
    '  user-select: none;',
    '}',
  ].join('\n')
  document.head.appendChild(style)

  // ── State ──────────────────────────────────────────────────────────────────

  var currentEditor = null // { element, key, rawValue, input }

  // ── Message Listener (parent → iframe) ────────────────────────────────────

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'preview-content-update') return
    window.__PREVIEW_CONTENT__ = event.data.content
    window.dispatchEvent(new CustomEvent('preview-content-changed'))
  })

  // ── Content Update Handler ─────────────────────────────────────────────────
  // Syncs all tagged elements' textContent to the latest preview content.
  // Skips the element currently being edited (has an active input).

  window.addEventListener('preview-content-changed', function () {
    if (!window.__PREVIEW_CONTENT__) return
    document.querySelectorAll('[data-content-key]').forEach(function (el) {
      if (currentEditor && currentEditor.element === el) return
      var val = getNestedValue(window.__PREVIEW_CONTENT__, el.getAttribute('data-content-key'))
      if (typeof val === 'string') el.textContent = val
    })
  })

  // ── Hover Highlighting (event delegation) ──────────────────────────────────

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-content-key]')
    if (!el) return
    if (currentEditor && currentEditor.element === el) return
    if (!el.querySelector('.__preview-pencil')) {
      var pencil = document.createElement('span')
      pencil.className = '__preview-pencil'
      pencil.textContent = '\u270F' // ✏ pencil
      el.appendChild(pencil)
    }
  })

  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest('[data-content-key]')
    if (!el) return
    // Don't remove if mouse is still inside the element (e.g., moved to pencil child)
    if (e.relatedTarget && el.contains(e.relatedTarget)) return
    var pencil = el.querySelector('.__preview-pencil')
    if (pencil) pencil.remove()
  })

  // ── Inline Edit (event delegation) ────────────────────────────────────────

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-content-key]')
    if (!el) return
    if (currentEditor) return // already editing something
    e.preventDefault()
    e.stopPropagation()
    activateEdit(el)
  })

  function activateEdit(element) {
    // Remove hover pencil icon
    var pencil = element.querySelector('.__preview-pencil')
    if (pencil) pencil.remove()

    var key = element.getAttribute('data-content-key')

    // Get raw value from preview content, not from rendered textContent
    // (rendered text may include prefixes or transforms)
    var rawValue
    if (window.__PREVIEW_CONTENT__) {
      var val = getNestedValue(window.__PREVIEW_CONTENT__, key)
      rawValue = val !== undefined ? String(val) : element.textContent
    } else {
      rawValue = element.textContent
    }

    // Decide between single-line input and textarea
    var tagName = element.tagName.toLowerCase()
    var isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'section'].indexOf(tagName) !== -1
    var useTextarea = isBlock || rawValue.length > 80

    // Copy visual styles from the original element
    var cs = window.getComputedStyle(element)
    var rect = element.getBoundingClientRect()

    var input = document.createElement(useTextarea ? 'textarea' : 'input')
    input.value = rawValue

    var styleProps = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight', 'textAlign', 'letterSpacing']
    styleProps.forEach(function (prop) {
      input.style[prop] = cs[prop]
    })
    input.style.background = 'rgba(255,255,255,0.97)'
    input.style.border = '2px solid #3b82f6'
    input.style.borderRadius = '4px'
    input.style.padding = '2px 6px'
    input.style.outline = 'none'
    input.style.boxSizing = 'border-box'
    input.style.width = Math.max(rect.width, 100) + 'px'
    input.style.display = 'inline-block'
    input.style.verticalAlign = 'top'
    if (useTextarea) {
      input.style.height = Math.max(rect.height, 60) + 'px'
      input.style.resize = 'vertical'
    }

    currentEditor = { element: element, key: key, rawValue: rawValue, input: input }

    // Swap element for input in the DOM
    element.replaceWith(input)
    input.focus()
    input.select()

    // Send field changes to parent portal on every keystroke
    input.addEventListener('input', function () {
      window.parent.postMessage({ type: 'preview-field-change', key: key, value: input.value }, '*')
    })

    function finish(revert) {
      if (!currentEditor) return
      var saved = currentEditor
      currentEditor = null
      saved.input.replaceWith(saved.element)
      // On Escape: revert to original value
      if (revert) {
        window.parent.postMessage({ type: 'preview-field-change', key: saved.key, value: saved.rawValue }, '*')
      }
    }

    input.addEventListener('blur', function () { finish(false) })
    input.addEventListener('keydown', function (e) {
      if (!useTextarea && e.key === 'Enter') { e.preventDefault(); input.blur() }
      if (e.key === 'Escape') { finish(true) }
    })
  }

  // ── Signal ready to parent immediately ────────────────────────────────────
  // The portal sends content on receiving this. Since module scripts
  // (React) are deferred, __PREVIEW_CONTENT__ will be set before React
  // mounts, so useContent() picks it up as initial state.

  window.parent.postMessage({ type: 'preview-ready' }, '*')
})()
