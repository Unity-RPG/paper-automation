/**
 * discovery.js — 论文推荐
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

  function getApiConfig() {
    var customUrl = localStorage.getItem('pa_api_url');
    var customKey = localStorage.getItem('pa_api_key');
    if (customUrl && customKey) {
      return { url: customUrl, key: customKey, direct: true };
    }
    return { url: '/api/analyze', key: '', direct: false };
  }

  // ==================== 论文推荐 ====================

  async function recommend() {
    var data = window.PaperFeatures ? window.PaperFeatures.getData() : null;
    if (!data) return;

    var section = $('recommend-section');
    var grid = $('recommend-grid');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
    grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--muted);">正在搜索相关论文...</div>';

    var config = getApiConfig();
    var keywords = (data.paperInfo.title || '') + ' ' + (data.paperInfo.tags || []).map(function (t) { return t.text; }).join(' ');

    try {
      var headers = { 'Content-Type': 'application/json' };
      var messages = [
        { role: 'system', content: '你是一个学术推荐助手。根据论文信息，推荐3篇最相关的经典论文。返回JSON数组：[{"title":"标题","authors":"作者","year":"年份","abstract":"简介(50字)","citations":"引用数"}]' },
        { role: 'user', content: '论文标题：' + data.paperInfo.title + '\n关键词：' + keywords }
      ];
      var body;

      if (config.direct) {
        headers['Authorization'] = 'Bearer ' + config.key;
        body = JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.5,
          max_tokens: 1000
        });
      } else {
        body = JSON.stringify({
          type: 'recommend',
          messages: messages,
          temperature: 0.5,
          max_tokens: 1000
        });
      }

      var res = await fetch(config.url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!res.ok) throw new Error('API错误 ' + res.status);
      var resData = await res.json();
      var content = resData.choices[0].message.content;
      if (content.indexOf('```') !== -1) {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      var papers = JSON.parse(content.trim());

      grid.innerHTML = papers.map(function (p) {
        return '<div class="recommend-card">' +
          '<h4>' + esc(p.title) + '</h4>' +
          '<div class="rec-authors">' + esc(p.authors) + ' · ' + esc(p.year) + '</div>' +
          '<div class="rec-abstract">' + esc(p.abstract) + '</div>' +
          '<div class="rec-meta">' +
          (p.citations ? '<span>📊 ' + esc(p.citations) + ' 引用</span>' : '') +
          '<span>🔗 搜索相关</span>' +
          '</div>' +
          '</div>';
      }).join('');

      grid.querySelectorAll('.recommend-card').forEach(function (card, idx) {
        card.addEventListener('click', function () {
          var title = papers[idx].title;
          window.open('https://scholar.google.com/scholar?q=' + encodeURIComponent(title), '_blank');
        });
      });

    } catch (err) {
      grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--danger);">推荐获取失败：' + esc(err.message) + '</div>';
    }
  }

  // ==================== 对外接口 ====================

  window.PaperDiscovery = {
    recommend: recommend
  };
})();
