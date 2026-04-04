;(function () {
  // Only activate in preview mode
  if (new URLSearchParams(window.location.search).get('preview') !== 'true') return

  // ── Utilities ──────────────────────────────────────────────────────────────

  function getNestedValue(obj, path) {
    return path.split('.').reduce(function (acc, k) {
      return acc != null ? acc[k] : undefined
    }, obj)
  }

  // Returns text from direct child text nodes only (not from descendant elements)
  function getDirectText(el) {
    var text = ''
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) text += el.childNodes[i].textContent
    }
    return text.trim()
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
    '[data-reorderable] {',
    '  position: relative;',
    '}',
    '.__drag-handle {',
    '  position: absolute;',
    '  top: 4px;',
    '  left: 4px;',
    '  width: 22px;',
    '  height: 22px;',
    '  background: rgba(0,0,0,0.45);',
    '  color: #fff;',
    '  border-radius: 4px;',
    '  font-size: 13px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  pointer-events: none;',
    '  z-index: 9998;',
    '  line-height: 1;',
    '  user-select: none;',
    '}',
  ].join('\n')
  document.head.appendChild(style)

  // ── State ──────────────────────────────────────────────────────────────────

  var currentEditor = null  // { element, key, rawValue, input }
  var pendingContentChanged = false

  var drag = {
    pending: false,
    active: false,
    timer: null,
    element: null,
    arrayPath: null,
    fromIndex: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    ghost: null,
    indicator: null,
    toIndex: null,
    happened: false,
  }

  // ── Content Map (for auto-detection) ──────────────────────────────────────

  var contentMap = Object.create(null)  // trimmed text → dotPath

  function buildContentMap(obj, prefix) {
    if (obj == null) return
    if (typeof obj === 'string') {
      var t = obj.trim()
      if (t.length >= 2) contentMap[t] = prefix
      return
    }
    if (typeof obj === 'number') {
      var s = String(obj)
      if (s.length >= 2) contentMap[s] = prefix
      return
    }
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        buildContentMap(obj[i], prefix ? prefix + '.' + i : String(i))
      }
      return
    }
    if (typeof obj === 'object') {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          buildContentMap(obj[key], prefix ? prefix + '.' + key : key)
        }
      }
    }
  }

  // ── Message Listener (parent → iframe) ────────────────────────────────────

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'preview-content-update') return
    console.log('[preview-bridge] received preview-content-update', event.data.content)
    window.__PREVIEW_CONTENT__ = event.data.content
    contentMap = Object.create(null)
    buildContentMap(window.__PREVIEW_CONTENT__, '')
    // Don't fire preview-content-changed while an inline edit is active — it would
    // trigger a React re-render that orphans the active input. Queue it instead.
    if (currentEditor) {
      pendingContentChanged = true
      return
    }
    window.dispatchEvent(new CustomEvent('preview-content-changed'))
  })

  // ── Content Update Handler ─────────────────────────────────────────────────
  // Syncs all tagged elements' textContent to the latest preview content.
  // Skips the element currently being edited.

  window.addEventListener('preview-content-changed', function () {
    if (!window.__PREVIEW_CONTENT__) return
    document.querySelectorAll('[data-content-key]').forEach(function (el) {
      if (currentEditor && currentEditor.element === el) return
      var val = getNestedValue(window.__PREVIEW_CONTENT__, el.getAttribute('data-content-key'))
      if (typeof val === 'string') el.textContent = val
    })
  })

  // ── Drag-and-Drop ──────────────────────────────────────────────────────────

  function startDrag() {
    drag.pending = false
    drag.active = true

    var el = drag.element
    var rect = el.getBoundingClientRect()
    drag.offsetX = drag.startX - rect.left
    drag.offsetY = drag.startY - rect.top

    // Fade the original element
    el.style.opacity = '0.4'

    // Create ghost — a clone without reorder attributes or injected handles
    var g = el.cloneNode(true)
    g.removeAttribute('data-reorderable')
    g.removeAttribute('data-reorder-index')
    var injected = g.querySelectorAll('.__drag-handle, .__preview-pencil')
    for (var i = 0; i < injected.length; i++) injected[i].remove()
    g.style.position = 'fixed'
    g.style.top = rect.top + 'px'
    g.style.left = rect.left + 'px'
    g.style.width = rect.width + 'px'
    g.style.height = rect.height + 'px'
    g.style.opacity = '0.85'
    g.style.pointerEvents = 'none'
    g.style.zIndex = '10001'
    g.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'
    g.style.borderRadius = '12px'
    g.style.transform = 'scale(1.02)'
    g.style.transition = 'none'
    g.style.margin = '0'
    document.body.appendChild(g)
    drag.ghost = g

    // Create drop-position indicator
    var ind = document.createElement('div')
    ind.style.cssText = 'position:fixed;height:3px;background:#3b82f6;border-radius:2px;z-index:10000;pointer-events:none;display:none;'
    document.body.appendChild(ind)
    drag.indicator = ind

    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }

  function updateDropTarget(clientX, clientY) {
    var siblings = Array.prototype.slice.call(
      document.querySelectorAll('[data-reorderable="' + drag.arrayPath + '"]')
    )
    if (!siblings.length) {
      drag.indicator.style.display = 'none'
      drag.toIndex = null
      return
    }

    siblings.sort(function (a, b) {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top
    })

    var visualIndex = siblings.length  // default: after last item
    var indTop = null, indLeft = null, indWidth = null

    for (var i = 0; i < siblings.length; i++) {
      var rect = siblings[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        // Cursor is in the upper half — drop before this sibling
        visualIndex = parseInt(siblings[i].getAttribute('data-reorder-index'), 10)
        indTop = rect.top - 2
        indLeft = rect.left
        indWidth = rect.width
        break
      } else {
        // Cursor is in the lower half — drop after this sibling (so far)
        visualIndex = parseInt(siblings[i].getAttribute('data-reorder-index'), 10) + 1
        indTop = rect.bottom + 1
        indLeft = rect.left
        indWidth = rect.width
      }
    }

    // Adjust for the removal of fromIndex shifting subsequent indices
    drag.toIndex = visualIndex <= drag.fromIndex ? visualIndex : visualIndex - 1

    if (indTop !== null) {
      drag.indicator.style.display = 'block'
      drag.indicator.style.top = indTop + 'px'
      drag.indicator.style.left = indLeft + 'px'
      drag.indicator.style.width = indWidth + 'px'
    }
  }

  function cancelDragPending() {
    clearTimeout(drag.timer)
    drag.pending = false
    drag.element = null
    drag.timer = null
  }

  function endActiveDrag(send) {
    if (send && drag.toIndex !== null && drag.toIndex !== drag.fromIndex) {
      window.parent.postMessage({
        type: 'preview-reorder',
        arrayPath: drag.arrayPath,
        fromIndex: drag.fromIndex,
        toIndex: drag.toIndex,
      }, '*')
    }
    if (drag.element) drag.element.style.opacity = ''
    if (drag.ghost) { drag.ghost.remove(); drag.ghost = null }
    if (drag.indicator) { drag.indicator.remove(); drag.indicator = null }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    drag.happened = true  // suppress the click event that follows mouseup
    drag.active = false
    drag.pending = false
    drag.element = null
    drag.timer = null
    drag.arrayPath = null
    drag.fromIndex = null
    drag.toIndex = null
  }

  // ── Tags to skip for editing/hover ─────────────────────────────────────────

  // A tags are NOT skipped — editable link text (CTA buttons etc.) should be clickable.
  // The click handler decides whether an <a> click should edit or navigate.
  var SKIP_TAGS = { INPUT: 1, TEXTAREA: 1, BUTTON: 1, SCRIPT: 1, STYLE: 1, SELECT: 1 }

  // Resolves a contentMap key for an element using three strategies:
  //   1. Direct child text nodes only (fastest, most precise)
  //   2. Full normalized textContent (catches pure-leaf elements)
  //   3. Emoji/punctuation-stripped textContent (catches "📍 Kelowna" etc.)
  function resolveContentKey(el) {
    if (!el || SKIP_TAGS[el.tagName]) return null
    var candidates = []

    var direct = getDirectText(el)
    if (direct.length >= 2) candidates.push(direct)

    var full = el.textContent.replace(/\s+/g, ' ').trim()
    if (full.length >= 2 && full !== direct) candidates.push(full)

    var stripped = full.replace(/^[^\w$"'(]+/, '').trim()
    if (stripped.length >= 2 && stripped !== full && stripped !== direct) candidates.push(stripped)

    for (var i = 0; i < candidates.length; i++) {
      if (contentMap[candidates[i]] !== undefined) return contentMap[candidates[i]]
    }
    return null
  }

  // ── Hover Highlighting (event delegation) ──────────────────────────────────

  document.addEventListener('mouseover', function (e) {
    if (drag.active) return  // don't inject UI while dragging

    // Drag handle for reorderable containers
    var reorderEl = e.target.closest('[data-reorderable]')
    if (reorderEl && !reorderEl.querySelector('.__drag-handle')) {
      var handle = document.createElement('span')
      handle.className = '__drag-handle'
      handle.textContent = '\u2807'  // ⠇ braille six-dot pattern (drag hint)
      reorderEl.appendChild(handle)
    }

    // Pencil for explicit data-content-key elements
    var el = e.target.closest('[data-content-key]')
    if (el && !(currentEditor && currentEditor.element === el)) {
      if (!el.querySelector('.__preview-pencil')) {
        var pencil = document.createElement('span')
        pencil.className = '__preview-pencil'
        pencil.textContent = '\u270F'
        el.appendChild(pencil)
      }
      return  // explicit key found — don't also run auto-detect for this hover
    }

    // Pencil for auto-detected text elements (check target only — no walk-up for perf)
    if (!el && !SKIP_TAGS[e.target.tagName]) {
      if (resolveContentKey(e.target) !== null && !e.target.querySelector('.__preview-pencil')) {
        var autoP = document.createElement('span')
        autoP.className = '__preview-pencil'
        autoP.textContent = '\u270F'
        e.target.appendChild(autoP)
      }
    }
  })

  document.addEventListener('mouseout', function (e) {
    if (drag.active) return

    // Remove drag handle when the cursor leaves the reorderable container
    var reorderEl = e.target.closest('[data-reorderable]')
    if (reorderEl && !(e.relatedTarget && reorderEl.contains(e.relatedTarget))) {
      var handle = reorderEl.querySelector('.__drag-handle')
      if (handle) handle.remove()
    }

    // Remove pencil — covers both explicit [data-content-key] and auto-detected
    var pencilHost = e.target.closest('[data-content-key]') || e.target
    if (pencilHost && !(e.relatedTarget && pencilHost.contains(e.relatedTarget))) {
      var pencil = pencilHost.querySelector('.__preview-pencil')
      if (pencil) pencil.remove()
    }
  })

  // ── Drag Events ────────────────────────────────────────────────────────────

  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return
    if (SKIP_TAGS[e.target.tagName]) return
    if (currentEditor) return

    var el = e.target.closest('[data-reorderable]')
    if (!el) return

    drag.pending = true
    drag.element = el
    drag.arrayPath = el.getAttribute('data-reorderable')
    drag.fromIndex = parseInt(el.getAttribute('data-reorder-index'), 10)
    drag.startX = e.clientX
    drag.startY = e.clientY
    drag.happened = false

    drag.timer = setTimeout(startDrag, 200)
  })

  document.addEventListener('mousemove', function (e) {
    if (drag.pending && !drag.active) {
      var dx = e.clientX - drag.startX
      var dy = e.clientY - drag.startY
      if (Math.sqrt(dx * dx + dy * dy) > 5) cancelDragPending()
      return
    }
    if (!drag.active) return

    drag.ghost.style.left = (e.clientX - drag.offsetX) + 'px'
    drag.ghost.style.top = (e.clientY - drag.offsetY) + 'px'
    updateDropTarget(e.clientX, e.clientY)
  })

  document.addEventListener('mouseup', function () {
    if (drag.active) {
      endActiveDrag(true)
    } else if (drag.pending) {
      cancelDragPending()
      // drag.happened stays false — click fires normally
    }
  })

  // ── Inline Edit (event delegation) ────────────────────────────────────────

  // Walk up from target to find an element whose text resolves to a contentMap key.
  // Container elements (those with element children) are only accepted when their
  // direct text nodes alone provide the match — prevents tagging a <li> or <div>
  // that matched on aggregated child text, which would wipe sibling elements on save.
  function findEditableEl(target) {
    var el = target
    for (var depth = 0; depth < 4; depth++) {
      if (!el || el === document.body) return null
      if (SKIP_TAGS[el.tagName]) return null

      var key = resolveContentKey(el)
      if (key !== null) {
        // Check for element children (excluding injected preview UI)
        var hasElementChildren = false
        for (var i = 0; i < el.childNodes.length; i++) {
          var child = el.childNodes[i]
          if (child.nodeType === 1 &&
              !child.classList.contains('__preview-pencil') &&
              !child.classList.contains('__drag-handle')) {
            hasElementChildren = true
            break
          }
        }
        if (!hasElementChildren) return el  // leaf — always safe
        // Has element children: only accept if direct text alone matched
        var direct = getDirectText(el)
        if (direct.length >= 2 && contentMap[direct] !== undefined) return el
        // Matched via aggregated child text — skip, it's a container
      }

      el = el.parentElement
    }
    return null
  }

  // ── Capture-phase listener: block navigation on editable <a> tags ────────────
  // Fires BEFORE the browser processes the href, so preventDefault() actually works.
  // Anchors inside <nav> or <header> are navigation-only — never intercepted.
  document.addEventListener('click', function (e) {
    if (e.ctrlKey || e.metaKey) return
    var anchor = e.target.closest('a')
    if (!anchor) return
    // Let nav/header links always navigate
    if (anchor.closest('nav') || anchor.closest('header')) return
    var hasKey = anchor.hasAttribute('data-content-key')
    var autoKey = !hasKey ? resolveContentKey(anchor) : null
    if (hasKey || autoKey) {
      e.preventDefault()
      e.stopImmediatePropagation()
      // Tag now so the bubble handler can find the key
      if (!hasKey && autoKey) anchor.setAttribute('data-content-key', autoKey)
      // Bubble handler will activate the edit — but stopImmediatePropagation()
      // prevents it, so activate directly here
      if (!currentEditor) activateEdit(anchor)
    }
  }, true)  // capture phase

  // ── Bubble-phase listener: activate edits on non-anchor elements ──────────
  document.addEventListener('click', function (e) {
    // Suppress the click that fires immediately after a completed drag
    if (drag.happened) { drag.happened = false; return }
    if (e.ctrlKey || e.metaKey) return

    // Anchors are handled entirely by the capture listener above
    if (e.target.closest('a')) return

    var el = e.target.closest('[data-content-key]')
    var key = null

    if (el) {
      key = el.getAttribute('data-content-key')
    } else {
      el = findEditableEl(e.target)
      if (el) {
        key = resolveContentKey(el)
        if (key) {
          el.setAttribute('data-content-key', key)
        } else {
          el = null
        }
      }
    }

    if (!el || !key) return
    if (currentEditor) return

    e.preventDefault()
    e.stopPropagation()
    activateEdit(el)
  })

  function activateEdit(element) {
    var pencil = element.querySelector('.__preview-pencil')
    if (pencil) pencil.remove()

    var key = element.getAttribute('data-content-key')

    var rawValue
    if (window.__PREVIEW_CONTENT__) {
      var val = getNestedValue(window.__PREVIEW_CONTENT__, key)
      rawValue = val !== undefined ? String(val) : element.textContent
    } else {
      rawValue = element.textContent
    }

    var tagName = element.tagName.toLowerCase()
    var isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'section'].indexOf(tagName) !== -1
    var useTextarea = isBlock || rawValue.length > 80

    var cs = window.getComputedStyle(element)
    var rect = element.getBoundingClientRect()

    var input = document.createElement(useTextarea ? 'textarea' : 'input')
    input.value = rawValue

    var styleProps = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight', 'textAlign', 'letterSpacing']
    styleProps.forEach(function (prop) { input.style[prop] = cs[prop] })
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

    element.replaceWith(input)
    input.focus()
    input.select()

    input.addEventListener('input', function () {
      window.parent.postMessage({ type: 'preview-field-change', key: key, value: input.value }, '*')
    })

    function finish(revert) {
      if (!currentEditor) return
      var saved = currentEditor
      currentEditor = null
      console.log('[preview-bridge] finish:', {
        revert: revert,
        inputValue: saved.input.value,
        trimmed: saved.input.value.trim(),
        isEmpty: saved.input.value.trim() === ''
      })
      if (!revert) {
        // Prevent empty values from making the element invisible and unclickable.
        // Use a non-breaking space (\u00A0) — a regular space may be collapsed by HTML.
        var finalValue = saved.input.value.trim() === '' ? '\u00A0' : saved.input.value
        saved.element.textContent = finalValue
        if (finalValue !== saved.input.value) {
          window.parent.postMessage({ type: 'preview-field-change', key: saved.key, value: finalValue }, '*')
        }
      }
      saved.input.replaceWith(saved.element)
      if (revert) {
        saved.element.textContent = saved.rawValue
        window.parent.postMessage({ type: 'preview-field-change', key: saved.key, value: saved.rawValue }, '*')
      }
      // Flush any queued content-changed event now that the editor is closed
      if (pendingContentChanged) {
        pendingContentChanged = false
        window.dispatchEvent(new CustomEvent('preview-content-changed'))
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
