/**
 * features.js — 导出、语音、笔记、进度、历史记录、分享功能
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

  // ==================== 当前论文数据（由 app.js 设置） ====================
  var currentData = null;
  var currentPaperId = null;

  window.PaperFeatures = {
    setData: function (data) {
      currentData = data;
      currentPaperId = generateId();
      saveToLibrary(data);
      renderNotes();
      resetProgress();
    },
    getData: function () { return currentData; },
    getPaperId: function () { return currentPaperId; }
  };

  function generateId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ==================== 导出 Markdown ====================

  function exportMarkdown() {
    if (!currentData) return;
    var d = currentData;
    var md = '# ' + esc(d.paperInfo.title) + '\n\n';
    md += '**作者：** ' + esc(d.paperInfo.authors) + '\n\n';
    if (d.keyContribution) md += '## 核心贡献\n\n' + esc(d.keyContribution) + '\n\n';
    md += '## 论文摘要\n\n' + stripHtml(d.summary) + '\n\n';
    if (d.concepts && d.concepts.length) {
      md += '## 关键概念\n\n';
      d.concepts.forEach(function (c) { md += '- **' + esc(c.term) + '**: ' + esc(c.desc) + '\n'; });
      md += '\n';
    }
    if (d.knowledgeCards && d.knowledgeCards.length) {
      md += '## 原理小知识\n\n';
      d.knowledgeCards.forEach(function (k) { md += '### ' + esc(k.title) + '\n\n' + esc(k.content) + '\n\n'; });
    }
    if (d.chapters && d.chapters.length) {
      md += '## 章节导读\n\n';
      d.chapters.forEach(function (ch) {
        md += '### CH.' + esc(ch.num) + ' ' + esc(ch.title) + '\n\n' + esc(ch.desc) + '\n\n';
        if (ch.insight) md += '> 💡 ' + esc(ch.insight) + '\n\n';
      });
    }
    downloadFile(md, 'paper-analysis.md', 'text/markdown');
  }

  // ==================== 导出 Anki ====================

  function exportAnki() {
    if (!currentData) return;
    var d = currentData;
    var lines = ['# Card Format: Front\tBack\n'];
    // 概念卡片
    if (d.concepts) {
      d.concepts.forEach(function (c) {
        lines.push(esc(c.term) + '\t' + esc(c.desc));
      });
    }
    // 知识卡片
    if (d.knowledgeCards) {
      d.knowledgeCards.forEach(function (k) {
        lines.push(esc(k.title) + '\t' + esc(k.content));
      });
    }
    // 问答
    if (d.games && d.games.quiz) {
      d.games.quiz.forEach(function (q) {
        lines.push(esc(q.q) + '\t' + esc(q.options[q.correct]) + ' (' + esc(q.explain) + ')');
      });
    }
    downloadFile(lines.join('\n'), 'paper-anki.txt', 'text/plain');
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  // ==================== 分享 ====================

  function generateShareLink() {
    if (!currentData) return;
    try {
      var json = JSON.stringify(currentData);
      var encoded = btoa(unescape(encodeURIComponent(json)));
      var url = window.location.origin + window.location.pathname + '?share=' + encoded;
      $('share-link-input').value = url;
      $('share-modal').classList.add('open');
    } catch (e) {
      alert('生成分享链接失败：' + e.message);
    }
  }

  // 检查 URL 中是否有分享数据
  function checkSharedData() {
    var params = new URLSearchParams(window.location.search);
    var share = params.get('share');
    if (share) {
      try {
        var json = decodeURIComponent(escape(atob(share)));
        var data = JSON.parse(json);
        // 延迟执行，等 app.js 加载完成
        setTimeout(function () {
          if (window.renderResultsFromShare) window.renderResultsFromShare(data);
        }, 500);
        return true;
      } catch (e) {
        console.error('解析分享数据失败', e);
      }
    }
    return false;
  }

  // ==================== 语音讲解 ====================

  var currentUtterance = null;

  window.speakText = function (text, btn) {
    if (!('speechSynthesis' in window)) {
      alert('您的浏览器不支持语音功能');
      return;
    }
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      if (btn) btn.classList.remove('playing');
      currentUtterance = null;
      return;
    }
    var u = new SpeechSynthesisUtterance(stripHtml(text));
    u.lang = 'zh-CN';
    u.rate = 1.0;
    u.onend = function () {
      if (btn) btn.classList.remove('playing');
      currentUtterance = null;
    };
    if (btn) btn.classList.add('playing');
    window.speechSynthesis.speak(u);
    currentUtterance = u;
  };

  // 为知识卡片添加语音按钮
  window.addVoiceButtons = function () {
    var cards = document.querySelectorAll('.knowledge-card');
    cards.forEach(function (card, idx) {
      if (card.querySelector('.voice-btn')) return;
      var titleEl = card.querySelector('h4');
      var contentEl = card.querySelector('p');
      if (!titleEl || !contentEl) return;
      var btn = document.createElement('button');
      btn.className = 'voice-btn';
      btn.innerHTML = '🔊 朗读';
      btn.addEventListener('click', function () {
        window.speakText(titleEl.textContent + '。' + contentEl.textContent, btn);
      });
      card.querySelector('.kc-label').appendChild(btn);
    });
  };

  // ==================== 笔记 ====================

  function getNotesKey() { return 'pa_notes_' + currentPaperId; }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(getNotesKey()) || '[]'); }
    catch (e) { return []; }
  }

  function saveNotes(notes) {
    localStorage.setItem(getNotesKey(), JSON.stringify(notes));
  }

  function renderNotes() {
    var section = $('notes-section');
    if (!section) return;
    var notes = getNotes();

    var html = notes.map(function (n, i) {
      return '<div class="note-item">' +
        '<span class="note-icon">📝</span>' +
        '<span class="note-text">' + esc(n) + '</span>' +
        '<span class="note-del" data-idx="' + i + '">✕</span>' +
        '</div>';
    }).join('');

    html += '<div class="note-add">' +
      '<input type="text" id="note-input" placeholder="写一条笔记..." autocomplete="off">' +
      '<button class="btn btn-primary btn-sm" id="note-add-btn">添加</button>' +
      '</div>';

    section.innerHTML = html;

    $('note-add-btn').addEventListener('click', addNote);
    $('note-input').addEventListener('keypress', function (e) {
      if (e.key === 'Enter') addNote();
    });
    section.querySelectorAll('.note-del').forEach(function (del) {
      del.addEventListener('click', function () {
        var idx = parseInt(del.getAttribute('data-idx'));
        var ns = getNotes();
        ns.splice(idx, 1);
        saveNotes(ns);
        renderNotes();
      });
    });
  }

  function addNote() {
    var input = $('note-input');
    var text = input.value.trim();
    if (!text) return;
    var notes = getNotes();
    notes.push(text);
    saveNotes(notes);
    input.value = '';
    renderNotes();
    updateProgress();
  }

  // ==================== 阅读进度 ====================

  function resetProgress() {
    if (!currentPaperId) return;
    localStorage.setItem('pa_progress_' + currentPaperId, '0');
    updateProgress();
  }

  function getProgress() {
    if (!currentPaperId) return 0;
    return parseInt(localStorage.getItem('pa_progress_' + currentPaperId) || '0');
  }

  function updateProgress() {
    if (!currentPaperId || !$('progress-fill')) return;
    var notes = getNotes().length;
    // 计算进度：看过的章节数 + 笔记数 + 游戏得分
    var chaptersViewed = 0;
    document.querySelectorAll('.chapter-card.open').forEach(function () { chaptersViewed++; });
    var totalChapters = document.querySelectorAll('.chapter-card').length || 1;
    var chapterPct = (chaptersViewed / totalChapters) * 50;
    var notesPct = Math.min(notes * 10, 30);
    var gameScore = 0;
    var matchScore = parseInt(($('match-score') || {}).textContent || '0');
    var matchTotal = parseInt(($('match-total') || {}).textContent || '1');
    gameScore += (matchScore / matchTotal) * 20;
    var pct = Math.min(Math.round(chapterPct + notesPct + gameScore), 100);
    localStorage.setItem('pa_progress_' + currentPaperId, String(pct));
    $('progress-fill').style.width = pct + '%';
    $('progress-pct').textContent = pct + '%';
  }

  // 章节展开时更新进度
  document.addEventListener('click', function (e) {
    if (e.target.closest('.chapter-header')) {
      setTimeout(updateProgress, 200);
    }
  });

  // ==================== 历史记录（论文库） ====================
  // 登录用户优先使用 Supabase 云端同步；未登录则使用 localStorage（功能5）

  function isCloudMode() {
    return !!(window.PaperAuth && window.PaperAuth.isLoggedIn());
  }

  function saveToLibrary(data) {
    if (!data || !data.paperInfo) return;
    var entry = {
      id: currentPaperId,
      title: data.paperInfo.title,
      authors: data.paperInfo.authors,
      date: new Date().toLocaleDateString('zh-CN'),
      data: data
    };
    if (isCloudMode()) {
      // 云端同步（失败时回退到本地，保证不丢数据）
      window.PaperAuth.savePaper(entry).catch(function (e) {
        console.error('云端保存失败，回退到本地存储:', e);
        saveToLibraryLocal(entry);
      });
    } else {
      saveToLibraryLocal(entry);
    }
  }

  function saveToLibraryLocal(entry) {
    var lib = getLibraryLocal();
    // 去重：如果标题相同则更新
    lib = lib.filter(function (item) { return item.title !== entry.title; });
    lib.unshift(entry);
    // 最多保存 20 篇
    if (lib.length > 20) lib = lib.slice(0, 20);
    try {
      localStorage.setItem('pa_library', JSON.stringify(lib));
    } catch (e) {
      // localStorage 满了，删掉最早的
      lib = lib.slice(0, 10);
      try { localStorage.setItem('pa_library', JSON.stringify(lib)); } catch (e2) {}
    }
  }

  function getLibraryLocal() {
    try { return JSON.parse(localStorage.getItem('pa_library') || '[]'); }
    catch (e) { return []; }
  }

  // 兼容旧调用：同步返回本地论文库
  function getLibrary() { return getLibraryLocal(); }

  // 登录时从 Supabase 加载，未登录时从 localStorage 加载
  async function loadLibrary() {
    if (isCloudMode()) {
      try {
        return await window.PaperAuth.loadPapers();
      } catch (e) {
        console.error('云端加载失败，回退到本地存储:', e);
        return getLibraryLocal();
      }
    }
    return getLibraryLocal();
  }

  async function renderLibrary() {
    var body = $('library-body');
    if (!body) return;
    body.innerHTML = '<div class="lib-empty">加载中...</div>';
    var lib = await loadLibrary();
    if (!lib || lib.length === 0) {
      body.innerHTML = '<div class="lib-empty">还没有解析过的论文，上传一篇试试吧！</div>';
      return;
    }
    body.innerHTML = lib.map(function (item) {
      return '<div class="lib-item" data-id="' + esc(item.id) + '">' +
        '<span class="lib-icon">📄</span>' +
        '<div class="lib-info">' +
        '<div class="lib-title">' + esc(item.title) + '</div>' +
        '<div class="lib-date">' + esc(item.authors) + ' · ' + esc(item.date) + '</div>' +
        '</div>' +
        '<span class="lib-del" data-id="' + esc(item.id) + '">✕</span>' +
        '</div>';
    }).join('');

    body.querySelectorAll('.lib-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.classList.contains('lib-del')) return;
        var id = el.getAttribute('data-id');
        var item = lib.find(function (i) { return i.id === id; });
        if (item && item.data) {
          currentPaperId = item.id;
          currentData = item.data;
          if (window.renderResultsFromShare) window.renderResultsFromShare(item.data);
          $('library-modal').classList.remove('open');
        }
      });
    });

    body.querySelectorAll('.lib-del').forEach(function (del) {
      del.addEventListener('click', async function (e) {
        e.stopPropagation();
        var id = del.getAttribute('data-id');
        if (isCloudMode()) {
          try { await window.PaperAuth.deletePaper(id); }
          catch (err) { console.error('云端删除失败:', err); }
        } else {
          var libLocal = getLibraryLocal().filter(function (i) { return i.id !== id; });
          localStorage.setItem('pa_library', JSON.stringify(libLocal));
        }
        renderLibrary();
      });
    });
  }

  // ==================== 事件绑定 ====================

  document.addEventListener('DOMContentLoaded', function () {
    $('btn-export-md') && $('btn-export-md').addEventListener('click', exportMarkdown);
    $('btn-export-anki') && $('btn-export-anki').addEventListener('click', exportAnki);
    $('btn-share') && $('btn-share').addEventListener('click', generateShareLink);
    $('btn-recommend') && $('btn-recommend').addEventListener('click', function () {
      if (window.PaperDiscovery) window.PaperDiscovery.recommend();
    });
    $('btn-compare') && $('btn-compare').addEventListener('click', function () {
      $('compare-section').style.display = 'block';
      $('compare-section').scrollIntoView({ behavior: 'smooth' });
    });

    // 论文库
    $('btn-library') && $('btn-library').addEventListener('click', function () {
      renderLibrary();
      $('library-modal').classList.add('open');
    });
    $('library-close') && $('library-close').addEventListener('click', function () {
      $('library-modal').classList.remove('open');
    });
    $('library-modal') && $('library-modal').addEventListener('click', function (e) {
      if (e.target === $('library-modal')) $('library-modal').classList.remove('open');
    });

    // 登录/登出后，若论文库模态框处于打开状态则刷新列表（功能5）
    if (window.PaperAuth && window.PaperAuth.onAuthChange) {
      window.PaperAuth.onAuthChange(function () {
        if ($('library-modal') && $('library-modal').classList.contains('open')) {
          renderLibrary();
        }
      });
    }

    // 分享模态框
    $('share-close') && $('share-close').addEventListener('click', function () {
      $('share-modal').classList.remove('open');
    });
    $('share-copy') && $('share-copy').addEventListener('click', function () {
      var input = $('share-link-input');
      input.select();
      try {
        document.execCommand('copy');
        $('share-copy-msg').style.display = 'block';
        setTimeout(function () { $('share-copy-msg').style.display = 'none'; }, 2000);
      } catch (e) {}
    });

    // 检查分享链接
    checkSharedData();
  });
})();
