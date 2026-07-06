/**
 * compare.js — 论文对比功能
 * 上传第二篇论文，生成对比表格
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

  var compareData = null; // 第二篇论文数据

  function getApiConfig() {
    var customUrl = localStorage.getItem('pa_api_url');
    var customKey = localStorage.getItem('pa_api_key');
    if (customUrl && customKey) {
      return { url: customUrl, key: customKey, direct: true };
    }
    return { url: '/api/analyze', key: '', direct: false };
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  async function handleCompareUpload(file) {
    if (!file) return;
    var slot2 = $('compare-slot-2');
    slot2.innerHTML = '<div class="slot-icon">⏳</div><div class="slot-text">正在解析...</div>';

    try {
      var text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (e) { resolve(e.target.result); };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      if (!text) {
        alert('无法提取文本');
        resetSlot();
        return;
      }

      // 调用 AI 解析
      var config = getApiConfig();
      var prompt = '请分析以下论文文本，返回简洁的 JSON：\n' +
        '{"title":"标题","authors":"作者","summary":"摘要(100字内)","method":"核心方法(一句话)","keyResult":"关键结果(一句话)","year":"年份"}\n\n' + text.substring(0, 8000);

      var headers = { 'Content-Type': 'application/json' };
      var body;
      var messages = [
        { role: 'system', content: '你是一个论文分析助手，只返回JSON' },
        { role: 'user', content: prompt }
      ];

      if (config.direct) {
        headers['Authorization'] = 'Bearer ' + config.key;
        body = JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.3,
          max_tokens: 1000
        });
      } else {
        body = JSON.stringify({
          type: 'compare',
          messages: messages,
          temperature: 0.3,
          max_tokens: 1000
        });
      }

      var res = await fetch(config.url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!res.ok) throw new Error('API错误 ' + res.status);
      var data = await res.json();
      var content = data.choices[0].message.content;
      if (content.indexOf('```') !== -1) {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      compareData = JSON.parse(content.trim());

      slot2.classList.add('filled');
      slot2.innerHTML = '<div class="slot-icon">📄</div><div class="slot-text">' + esc(compareData.title) + '</div>';

      renderCompareTable();
    } catch (err) {
      alert('对比论文解析失败：' + err.message);
      resetSlot();
    }
  }

  function resetSlot() {
    var slot2 = $('compare-slot-2');
    slot2.classList.remove('filled');
    slot2.innerHTML = '<div class="slot-icon">➕</div><div class="slot-text">点击上传对比论文</div>';
  }

  function renderCompareTable() {
    var d1 = window.PaperFeatures ? window.PaperFeatures.getData() : null;
    var d2 = compareData;
    if (!d1 || !d2) return;

    var rows = [
      { label: '标题', v1: d1.paperInfo.title, v2: d2.title },
      { label: '作者', v1: d1.paperInfo.authors, v2: d2.authors },
      { label: '摘要', v1: stripHtml(d1.summary).substring(0, 150) + '...', v2: d2.summary },
      { label: '核心方法', v1: d1.keyContribution || '-', v2: d2.method || '-' },
      { label: '关键结果', v1: (d1.chapters && d1.chapters.find(function (c) { return c.highlight; })) ? d1.chapters.find(function (c) { return c.highlight; }).desc.substring(0, 100) : '-', v2: d2.keyResult || '-' },
      { label: '年份', v1: (d1.paperInfo.authors || '').match(/\d{4}/) ? (d1.paperInfo.authors.match(/\d{4}/)[0]) : '-', v2: d2.year || '-' }
    ];

    var html = '<div class="compare-table-wrap"><table class="compare-table">' +
      '<thead><tr><th>对比维度</th><th>论文 A</th><th>论文 B</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td class="row-label">' + esc(r.label) + '</td>' +
        '<td>' + esc(r.v1) + '</td><td>' + esc(r.v2) + '</td></tr>';
    });
    html += '</tbody></table></div>';

    $('compare-result').innerHTML = html;
  }

  // PDF 提取（复用 app.js 的逻辑）
  function extractPdfText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var typedArray = new Uint8Array(e.target.result);
        pdfjsLib.getDocument({ data: typedArray, useWorkerFetch: false, isEvalSupported: false }).promise.then(function (pdf) {
          var maxPages = Math.min(pdf.numPages, 20);
          var pagePromises = [];
          for (var i = 1; i <= maxPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then(function (page) {
                return page.getTextContent().then(function (content) {
                  return content.items.map(function (item) { return item.str; }).join(' ');
                });
              })
            );
          }
          Promise.all(pagePromises).then(function (pages) {
            resolve(pages.join('\n\n'));
          }).catch(reject);
        }).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var slot2 = $('compare-slot-2');
    var fileInput = $('compare-file-input');

    if (slot2) {
      slot2.addEventListener('click', function () {
        fileInput.click();
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
          handleCompareUpload(e.target.files[0]);
        }
      });
    }
  });
})();
