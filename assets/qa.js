/**
 * qa.js — 深度问答功能
 * 浮动聊天面板，基于当前论文内容回答用户问题
 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

  var qaHistory = [];
  var isWaiting = false;

  function getApiConfig() {
    var customUrl = localStorage.getItem('pa_api_url');
    var customKey = localStorage.getItem('pa_api_key');
    if (customUrl && customKey) {
      return { url: customUrl, key: customKey, direct: true };
    }
    return { url: '/api/analyze', key: '', direct: false };
  }

  function togglePanel() {
    var panel = $('qa-panel');
    panel.classList.toggle('open');
  }

  function addMessage(text, type) {
    var msg = document.createElement('div');
    msg.className = 'qa-msg ' + type;
    msg.innerHTML = esc(text);
    $('qa-messages').appendChild(msg);
    $('qa-messages').scrollTop = $('qa-messages').scrollHeight;
    return msg;
  }

  function buildContext() {
    var data = window.PaperFeatures ? window.PaperFeatures.getData() : null;
    if (!data) return '';
    var ctx = '论文标题：' + (data.paperInfo.title || '') + '\n';
    ctx += '作者：' + (data.paperInfo.authors || '') + '\n';
    ctx += '摘要：' + stripHtml(data.summary || '') + '\n';
    if (data.keyContribution) ctx += '核心贡献：' + data.keyContribution + '\n';
    if (data.concepts) {
      ctx += '关键概念：\n';
      data.concepts.forEach(function (c) {
        ctx += '- ' + c.term + ': ' + c.desc + '\n';
      });
    }
    if (data.chapters) {
      ctx += '章节内容：\n';
      data.chapters.forEach(function (ch) {
        ctx += 'CH.' + ch.num + ' ' + ch.title + ': ' + (ch.desc || '').substring(0, 200) + '\n';
      });
    }
    return ctx;
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  async function sendQuestion() {
    var input = $('qa-input');
    var question = input.value.trim();
    if (!question || isWaiting) return;

    addMessage(question, 'user');
    input.value = '';
    isWaiting = true;
    $('qa-send').disabled = true;

    var loadingMsg = addMessage('正在思考...', 'loading');

    try {
      var config = getApiConfig();
      var context = buildContext();

      var messages = [
        { role: 'system', content: '你是一个论文问答助手。请根据以下论文信息回答用户的问题。回答要简洁易懂，用中文回答。\n\n论文信息：\n' + context }
      ];

      // 添加历史对话
      qaHistory.forEach(function (h) {
        messages.push({ role: 'user', content: h.q });
        messages.push({ role: 'assistant', content: h.a });
      });
      messages.push({ role: 'user', content: question });

      var headers = { 'Content-Type': 'application/json' };
      var body;

      if (config.direct) {
        headers['Authorization'] = 'Bearer ' + config.key;
        body = JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.5,
          max_tokens: 1500
        });
      } else {
        body = JSON.stringify({
          type: 'qa',
          messages: messages,
          temperature: 0.5,
          max_tokens: 1500
        });
      }

      var res = await fetch(config.url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!res.ok) {
        var err = await res.json();
        throw new Error(err.error ? err.error.message : 'API错误 ' + res.status);
      }

      var data = await res.json();
      var answer = data.choices[0].message.content;

      loadingMsg.remove();
      addMessage(answer, 'ai');

      qaHistory.push({ q: question, a: answer });
      if (qaHistory.length > 10) qaHistory.shift();

    } catch (err) {
      loadingMsg.remove();
      addMessage('回答失败：' + err.message, 'ai');
    } finally {
      isWaiting = false;
      $('qa-send').disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('qa-fab') && $('qa-fab').addEventListener('click', togglePanel);
    $('qa-close') && $('qa-close').addEventListener('click', togglePanel);
    $('qa-send') && $('qa-send').addEventListener('click', sendQuestion);
    $('qa-input') && $('qa-input').addEventListener('keypress', function (e) {
      if (e.key === 'Enter') sendQuestion();
    });
  });
})();
