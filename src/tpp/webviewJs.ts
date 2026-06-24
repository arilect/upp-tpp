export function generateWebviewJs(isPublish: boolean): string {
  if (isPublish) return '';
  return `  <script>
    const vsCodeApi = (typeof acquireVsCodeApi !== 'undefined') ? acquireVsCodeApi() : null;
    let zoomLevel = 100;
    const ZOOM_STEP = 10;

    function updateZoom() {
      const wrapper = document.getElementById('zoom-wrapper');
      wrapper.style.transform = 'scale(' + (zoomLevel / 100) + ')';
      document.getElementById('zoom-level').textContent = zoomLevel + '%';
      if (vsCodeApi) {
        vsCodeApi.postMessage({ type: 'zoomChanged', zoom: zoomLevel });
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('zoom-in').addEventListener('click', function(e) {
        e.stopPropagation();
        zoomLevel = Math.min(300, zoomLevel + ZOOM_STEP);
        updateZoom();
      });
      document.getElementById('zoom-out').addEventListener('click', function(e) {
        e.stopPropagation();
        zoomLevel = Math.max(25, zoomLevel - ZOOM_STEP);
        updateZoom();
      });
      document.getElementById('zoom-reset').addEventListener('click', function(e) {
        e.stopPropagation();
        zoomLevel = 100;
        updateZoom();
      });
      document.getElementById('zoom-fit').addEventListener('click', function(e) {
        e.stopPropagation();
        zoomLevel = Math.round((window.innerWidth / document.getElementById('zoom-wrapper').scrollWidth) * 100);
        updateZoom();
      });
      document.getElementById('scroll-top').addEventListener('click', function(e) {
        e.stopPropagation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      document.getElementById('scroll-bottom').addEventListener('click', function(e) {
        e.stopPropagation();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      });

      // Code block copy buttons
      document.querySelectorAll('.code-copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var code = btn.getAttribute('data-code') || '';
          navigator.clipboard.writeText(code);
          btn.textContent = 'copied!';
          btn.classList.add('copied');
          setTimeout(function() { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
        });
      });
    });

    function showAlert(msg) {
      var alertDiv = document.createElement('div');
      alertDiv.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#007acc;color:#fff;padding:8px 16px;font-size:13px;font-family:monospace;border:none;outline:none;';
      alertDiv.textContent = msg;
      document.body.appendChild(alertDiv);
      setTimeout(function(){ alertDiv.remove(); }, 5000);
    }

    function getSettings() {
      return {
        fontSize: parseInt(document.getElementById('set-fontSize').value) || 18,
        lineHeight: parseFloat(document.getElementById('set-lineHeight').value) || 1.6,
        fontFamily: document.getElementById('set-fontFamily').value || '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        codeFontFamily: document.getElementById('set-codeFontFamily').value || 'Cascadia Code, Fira Code, monospace',
        textColor: document.getElementById('set-textColor').value,
        backgroundColor: document.getElementById('set-backgroundColor').value,
        headingColor: document.getElementById('set-headingColor').value,
        linkColor: document.getElementById('set-linkColor').value,
        codeBackground: document.getElementById('set-codeBackground').value,
        codeColor: document.getElementById('set-codeColor').value,
        borderColor: document.getElementById('set-borderColor').value,
        keywordColor: document.getElementById('set-keywordColor').value,
        paramColor: document.getElementById('set-paramColor').value,
        preprocessorColor: document.getElementById('set-preprocessorColor').value,
        stringColor: document.getElementById('set-stringColor').value,
        typeColor: document.getElementById('set-typeColor').value,
        operatorColor: document.getElementById('set-operatorColor').value,
        commentColor: document.getElementById('set-commentColor').value,
        bgYellow: document.getElementById('set-bgYellow').value,
        bgRed: document.getElementById('set-bgRed').value,
        bgGreen: document.getElementById('set-bgGreen').value,
        bgBlue: document.getElementById('set-bgBlue').value,
        bgMagenta: document.getElementById('set-bgMagenta').value,
        bgCyan: document.getElementById('set-bgCyan').value,
        bgCustom: document.getElementById('set-bgCustom').value,
        tableBackgroundColor: document.getElementById('set-tableBackgroundColor').value,
        serifFontFamily: document.getElementById('set-serifFontFamily').value || 'serif',
        codeFontSize: parseInt(document.getElementById('set-codeFontSize').value) || 13,
        codeMarginLeft: parseInt(document.getElementById('set-codeMarginLeft').value) || 64,
        listMarginLeft: parseInt(document.getElementById('set-listMarginLeft').value) || 45,
        size0: parseInt(document.getElementById('set-size0').value) || 18,
        size1: parseInt(document.getElementById('set-size1').value) || 24,
        size2: parseInt(document.getElementById('set-size2').value) || 30,
        size3: parseInt(document.getElementById('set-size3').value) || 36,
        size4: parseInt(document.getElementById('set-size4').value) || 48,
        size5: parseInt(document.getElementById('set-size5').value) || 60,
        size6: parseInt(document.getElementById('set-size6').value) || 72,
        size7: parseInt(document.getElementById('set-size7').value) || 84,
        size8: parseInt(document.getElementById('set-size8').value) || 108,
        size9: parseInt(document.getElementById('set-size9').value) || 144,
        codeRenderingMode: document.getElementById('set-codeRenderingMode').value || 'vscode',
        uppsrcScanMode: document.getElementById('set-uppsrcScanMode').value || 'varfiles',
        uppsrcCustomPath: document.getElementById('set-uppsrcCustomPath').value || '',
        formatCode: document.getElementById('set-formatCode').checked,
        formatStyle: document.getElementById('set-formatStyle').value || 'U++',
      };
    }

    function applySettings(s) {
      var b = document.body;
      var r = document.documentElement;
      r.style.setProperty('--tpp-keyword-color', s.keywordColor);
      r.style.setProperty('--tpp-param-color', s.paramColor);
      r.style.setProperty('--tpp-preprocessor-color', s.preprocessorColor);
      r.style.setProperty('--tpp-string-color', s.stringColor);
      r.style.setProperty('--tpp-type-color', s.typeColor);
      r.style.setProperty('--tpp-operator-color', s.operatorColor);
      r.style.setProperty('--tpp-comment-color', s.commentColor);
      r.style.setProperty('--tpp-bg-yellow', s.bgYellow);
      r.style.setProperty('--tpp-bg-red', s.bgRed);
      r.style.setProperty('--tpp-bg-green', s.bgGreen);
      r.style.setProperty('--tpp-bg-blue', s.bgBlue);
      r.style.setProperty('--tpp-bg-magenta', s.bgMagenta);
      r.style.setProperty('--tpp-bg-cyan', s.bgCyan);
      r.style.setProperty('--tpp-bg-custom', s.bgCustom);
      r.style.setProperty('--tpp-table-bg', s.tableBackgroundColor);
      r.style.setProperty('--tpp-serif-font', s.serifFontFamily);
      r.style.setProperty('--tpp-code-font-size', s.codeFontSize + 'px');
      r.style.setProperty('--tpp-code-margin-left', s.codeMarginLeft + 'px');
      r.style.setProperty('--tpp-list-margin-left', s.listMarginLeft + 'px');
      b.style.fontFamily = s.fontFamily;
      b.style.fontSize = s.fontSize + 'px';
      b.style.lineHeight = s.lineHeight;
      b.style.color = s.textColor;
      b.style.background = s.backgroundColor;
      var headings = b.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (var i = 0; i < headings.length; i++) {
        headings[i].style.color = s.headingColor;
        headings[i].style.fontFamily = s.fontFamily;
      }
      if (headings.length) {
        headings[0].style.borderBottomColor = s.borderColor;
      }
      var links = b.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) links[i].style.color = s.linkColor;
      var codes = b.querySelectorAll('code, pre');
      for (var i = 0; i < codes.length; i++) {
        codes[i].style.background = s.codeBackground;
        codes[i].style.fontFamily = s.fontFamily;
      }
      var tds = b.querySelectorAll('td, th');
      for (var i = 0; i < tds.length; i++) {
        tds[i].style.borderColor = s.borderColor;
        tds[i].style.fontFamily = s.fontFamily;
      }
      var pres = b.querySelectorAll('pre');
      for (var i = 0; i < pres.length; i++) pres[i].style.fontFamily = s.fontFamily;
    }

    function saveSettings() {
      var s = getSettings();
      applySettings(s);
      if (vsCodeApi) {
        vsCodeApi.postMessage({ type: 'saveSettings', settings: s });
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('settings-toggle').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('settings-panel').classList.toggle('open');
        document.getElementById('find-bar').classList.remove('open');
      });

      document.getElementById('find-toggle').addEventListener('click', function(e) {
        e.stopPropagation();
        var fb = document.getElementById('find-bar');
        if (fb.classList.contains('open')) {
          fb.classList.remove('open');
          clearHighlights();
        } else {
          openFindBar();
        }
      });

      document.getElementById('find-input').addEventListener('input', function() {
        highlightAll(this.value);
      });

      document.getElementById('find-next').addEventListener('click', function(e) {
        e.stopPropagation();
        if (findMatches.length === 0) return;
        findCurrentIdx = (findCurrentIdx + 1) % findMatches.length;
        scrollToMatch(findCurrentIdx);
      });

      document.getElementById('find-prev').addEventListener('click', function(e) {
        e.stopPropagation();
        if (findMatches.length === 0) return;
        findCurrentIdx = (findCurrentIdx - 1 + findMatches.length) % findMatches.length;
        scrollToMatch(findCurrentIdx);
      });

      document.getElementById('find-close').addEventListener('click', function(e) {
        e.stopPropagation();
        closeFindBar();
      });

      document.getElementById('find-input').addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeFindBar();
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (findMatches.length === 0) return;
          if (e.shiftKey) {
            findCurrentIdx = (findCurrentIdx - 1 + findMatches.length) % findMatches.length;
          } else {
            findCurrentIdx = (findCurrentIdx + 1) % findMatches.length;
          }
          scrollToMatch(findCurrentIdx);
          e.preventDefault();
        }
      });

      var inputs = document.querySelectorAll('#settings-panel input, #settings-panel select');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', saveSettings);
        inputs[i].addEventListener('change', saveSettings);
      }

      var scanModeSelect = document.getElementById('set-uppsrcScanMode');
      var customPathRow = document.getElementById('set-uppsrcCustomPath-row');
      scanModeSelect.addEventListener('change', function() {
        customPathRow.style.display = scanModeSelect.value === 'custom' ? 'flex' : 'none';
      });

      document.getElementById('settings-reset').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('set-fontSize').value = 18;
        document.getElementById('set-lineHeight').value = 1.6;
        document.getElementById('set-fontFamily').value = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
        document.getElementById('set-codeFontFamily').value = 'Cascadia Code, Fira Code, monospace';
        document.getElementById('set-textColor').value = '#d4d4d4';
        document.getElementById('set-backgroundColor').value = '#1e1e1e';
        document.getElementById('set-headingColor').value = '#569cd6';
        document.getElementById('set-linkColor').value = '#4ec9b0';
        document.getElementById('set-codeBackground').value = '#2d2d2d';
        document.getElementById('set-codeColor').value = '#569cd6';
        document.getElementById('set-borderColor').value = '#3c3c3c';
        document.getElementById('set-keywordColor').value = '#569cd6';
        document.getElementById('set-paramColor').value = '#ff0000';
        document.getElementById('set-preprocessorColor').value = '#8000ff';
        document.getElementById('set-stringColor').value = '#800000';
        document.getElementById('set-typeColor').value = '#008080';
        document.getElementById('set-operatorColor').value = '#0000ff';
        document.getElementById('set-commentColor').value = '#008000';
        document.getElementById('set-bgYellow').value = '#cccc44';
        document.getElementById('set-bgRed').value = '#ff6666';
        document.getElementById('set-bgGreen').value = '#66cc66';
        document.getElementById('set-bgBlue').value = '#569cd6';
        document.getElementById('set-bgMagenta').value = '#ff66ff';
        document.getElementById('set-bgCyan').value = '#66ffff';
        document.getElementById('set-bgCustom').value = '#555555';
        document.getElementById('set-tableBackgroundColor').value = '#712a00';
        document.getElementById('set-serifFontFamily').value = 'serif';
        document.getElementById('set-codeFontSize').value = 13;
        document.getElementById('set-codeMarginLeft').value = 64;
        document.getElementById('set-listMarginLeft').value = 45;
        document.getElementById('set-size0').value = 18;
        document.getElementById('set-size1').value = 24;
        document.getElementById('set-size2').value = 30;
        document.getElementById('set-size3').value = 36;
        document.getElementById('set-size4').value = 48;
        document.getElementById('set-size5').value = 60;
        document.getElementById('set-size6').value = 72;
        document.getElementById('set-size7').value = 84;
        document.getElementById('set-size8').value = 108;
        document.getElementById('set-size9').value = 144;
        document.getElementById('set-codeRenderingMode').value = 'vscode';
        document.getElementById('set-uppsrcScanMode').value = 'varfiles';
        document.getElementById('set-uppsrcCustomPath').value = '';
        document.getElementById('set-uppsrcCustomPath-row').style.display = 'none';
        document.getElementById('set-formatCode').checked = true;
        document.getElementById('set-formatStyle').value = 'U++';
        saveSettings();
      });
    });

    document.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        zoomLevel = Math.min(300, Math.max(25, zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
        updateZoom();
      }
    }, { passive: false });

    function scrollToAnchor(anchor) {
      var el = document.getElementById(anchor);
      // If the found element is a link (self-referential), skip it and fall back to other strategies
      if (el && el.tagName !== 'A') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showAlert('SCROLLED to #' + anchor);
        return true;
      }
      var anchorLower = anchor.toLowerCase();
      var allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
      for (var i = 0; i < allElements.length; i++) {
        var text = (allElements[i].textContent || '').trim();
        var textLower = text.toLowerCase();
        if (textLower.startsWith(anchorLower + '.') || textLower.startsWith(anchorLower + ' ') || textLower === anchorLower) {
          allElements[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
          showAlert('SCROLLED to text: ' + text.substring(0, 60));
          return true;
        }
      }
      showAlert('NO MATCH for anchor "' + anchor + '"');
      return false;
    }

    document.addEventListener('click', function(e) {
      if (ctxMenu && ctxMenu.contains(e.target)) return;
      if (e.target.closest('#zoom-controls') || e.target.closest('#find-bar')) return;
      var link = e.target.closest('a');
      if (link) {
        var rawHref = link.getAttribute('data-href') || link.getAttribute('href') || '';
        if (rawHref.charAt(0) === '#') {
          e.preventDefault();
          e.stopPropagation();
          scrollToAnchor(decodeURIComponent(rawHref.substring(1)));
        } else if (rawHref.startsWith('topic://') && vsCodeApi) {
          e.preventDefault();
          e.stopPropagation();
          vsCodeApi.postMessage({ type: 'openTopic', url: rawHref });
        }
      }
    }, true);

    // Listen for messages from the extension (e.g. scroll to anchor)
    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.type === 'scrollToAnchor' && msg.anchor) {
        scrollToAnchor(decodeURIComponent(msg.anchor));
      } else if (msg.type === 'searchQuery' && msg.query) {
        var fb = document.getElementById('find-bar');
        fb.classList.add('open');
        var fi = document.getElementById('find-input');
        fi.value = msg.query;
        highlightAll(msg.query);
        fi.focus();
      }
    });

    // Find bar functionality
    var findMatches = [];
    var findCurrentIdx = -1;

    function escapeRegExp(s) {
      var re = /[-\\/\\\\^$*+?.()|[\\]{}]/g;
      return s.replace(re, '\\\\$&');
    }

    function clearHighlights() {
      for (var i = findMatches.length - 1; i >= 0; i--) {
        var m = findMatches[i];
        var parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent), m);
          parent.normalize();
        }
      }
      findMatches = [];
      findCurrentIdx = -1;
    }

    function highlightAll(query) {
      clearHighlights();
      var findCount = document.getElementById('find-count');
      if (!query) { findCount.textContent = ''; return; }
      var wrapper = document.getElementById('zoom-wrapper');
      var regex = new RegExp(escapeRegExp(query), 'gi');
      var tw = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (tw.nextNode()) textNodes.push(tw.currentNode);
      for (var n = 0; n < textNodes.length; n++) {
        var node = textNodes[n];
        var text = node.textContent;
        if (!regex.test(text)) continue;
        regex.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        var match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
          var span = document.createElement('span');
          span.className = 'find-match';
          span.textContent = match[0];
          frag.appendChild(span);
          findMatches.push(span);
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.substring(lastIdx)));
        node.parentNode.replaceChild(frag, node);
      }
      findCurrentIdx = findMatches.length > 0 ? 0 : -1;
      updateCount();
      if (findMatches.length > 0) scrollToMatch(0);
    }

    function updateCount() {
      var findCount = document.getElementById('find-count');
      var findInput = document.getElementById('find-input');
      var findPrev = document.getElementById('find-prev');
      var findNext = document.getElementById('find-next');
      if (findMatches.length === 0) {
        findCount.textContent = findInput.value ? 'No results' : '';
      } else {
        findCount.textContent = (findCurrentIdx + 1) + ' of ' + findMatches.length;
      }
      findPrev.disabled = findMatches.length === 0;
      findNext.disabled = findMatches.length === 0;
    }

    function scrollToMatch(idx) {
      for (var i = 0; i < findMatches.length; i++) {
        findMatches[i].classList.toggle('current', i === idx);
      }
      if (idx >= 0 && idx < findMatches.length) {
        findMatches[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      updateCount();
    }

    function openFindBar() {
      document.getElementById('find-bar').classList.add('open');
      var fi = document.getElementById('find-input');
      fi.focus();
      fi.select();
    }

    function closeFindBar() {
      document.getElementById('find-bar').classList.remove('open');
      clearHighlights();
      document.getElementById('find-count').textContent = '';
      document.getElementById('find-input').value = '';
    }

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openFindBar();
      }
    });

    // Context menu
    var ctxMenu = document.createElement('div');
    ctxMenu.id = 'ctx-menu';
    ctxMenu.style.cssText = 'display:none;position:fixed;background:#252526;border:1px solid #454545;border-radius:4px;padding:4px 0;z-index:10000;min-width:180px;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-family:var(--tpp-font-family);font-size:13px;';

    function makeCtxItem(label, action) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:6px 16px;cursor:pointer;color:#d4d4d4;';
      item.textContent = label;
      item.addEventListener('mouseenter', function() { item.style.background = '#094771'; });
      item.addEventListener('mouseleave', function() { item.style.background = ''; });
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        ctxMenu.style.display = 'none';
        action();
      });
      return item;
    }

    function makeSeparator() {
      var sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid #454545;margin:4px 0;';
      return sep;
    }

    var ctxClickedElement = null;

    // Copy
    ctxMenu.appendChild(makeCtxItem('Copy', function() {
      var sel = window.getSelection();
      if (sel && sel.toString().length > 0) {
        navigator.clipboard.writeText(sel.toString());
      } else if (ctxClickedElement) {
        var el = ctxClickedElement;
        // Get closest paragraph-like element text
        var target = el.closest('p') || el.closest('td') || el;
        navigator.clipboard.writeText(target.textContent || '');
      }
    }));

    // Copy Code Block (only visible when on a code block)
    var copyCodeItem = makeCtxItem('Copy Code', function() {
      if (ctxClickedElement) {
        var wrap = ctxClickedElement.closest('.code-block-wrap');
        if (wrap) {
          var btn = wrap.querySelector('.code-copy-btn');
          if (btn) {
            var code = btn.getAttribute('data-code') || '';
            navigator.clipboard.writeText(code);
          }
        }
      }
    });
    copyCodeItem.id = 'ctx-copy-code';
    ctxMenu.appendChild(copyCodeItem);

    // Copy Link (only visible when on a link)
    var copyLinkItem = makeCtxItem('Copy Link', function() {
      if (ctxClickedElement) {
        var link = ctxClickedElement.closest('a');
        if (link) {
          var url = link.getAttribute('data-href') || link.href;
          navigator.clipboard.writeText(url);
        }
      }
    });
    copyLinkItem.id = 'ctx-copy-link';
    ctxMenu.appendChild(copyLinkItem);

    ctxMenu.appendChild(makeSeparator());

    // View HTML Source
    ctxMenu.appendChild(makeCtxItem('View HTML Source', function() {
      if (vsCodeApi) {
        var target = ctxClickedElement;
        var paraText = '';
        if (target) {
          var para = target.closest('p');
          if (para) {
            paraText = para.textContent.trim().substring(0, 120);
          }
        }
        vsCodeApi.postMessage({ type: 'viewHtmlSource', anchorText: paraText });
      }
    }));

    // View TPP Source
    ctxMenu.appendChild(makeCtxItem('View TPP Source', function() {
      if (vsCodeApi) {
        var target = ctxClickedElement;
        var paraText = '';
        if (target) {
          var para = target.closest('p');
          if (para) {
            paraText = para.textContent.trim().substring(0, 120);
          }
        }
        vsCodeApi.postMessage({ type: 'viewTppSource', anchorText: paraText });
      }
    }));

    document.addEventListener('contextmenu', function(e) {
      ctxClickedElement = e.target;
      document.body.appendChild(ctxMenu);
      e.preventDefault();

      // Show/hide Copy Link based on whether we're on a link
      var onLink = e.target.closest('a');
      copyLinkItem.style.display = onLink ? '' : 'none';

      // Show/hide Copy Code based on whether we're on a code block
      var onCode = e.target.closest('.code-block-wrap');
      copyCodeItem.style.display = onCode ? '' : 'none';

      ctxMenu.style.display = 'block';
      // Keep menu within viewport
      var menuW = 200, menuH = 160;
      var x = e.clientX;
      var y = e.clientY;
      if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 4;
      if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 4;
      ctxMenu.style.left = x + 'px';
      ctxMenu.style.top = y + 'px';
    });

    document.addEventListener('click', function() {
      ctxMenu.style.display = 'none';
    });

  </script>`;
}
