/**
 * 论文自动化 · 核心应用逻辑
 * 功能：PDF文本提取、AI接口调用、结果渲染、视图管理
 */
(function () {
  'use strict';

  // ==================== 配置 ====================

  // 设置 pdf.js worker 路径（优先用 CDN，避免本地文件加载问题）
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // ==================== Demo 数据 ====================

  var DEMO_DATA = {
    paperInfo: {
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani et al. · Google Brain · 2017',
      tags: [
        { text: '深度学习', color: 'blue' },
        { text: '自然语言处理', color: 'blue' },
        { text: 'Transformer', color: 'purple' },
        { text: '注意力机制', color: '' }
      ]
    },
    summary: '本文提出了一种全新的神经网络架构 <strong>Transformer</strong>，完全摒弃了循环神经网络和卷积神经网络，仅依赖<mark class="key">注意力机制</mark>来处理序列数据。该架构在机器翻译任务上取得了当时最优表现，同时大幅提升了训练并行度和效率。',
    keyContribution: '核心贡献：提出了自注意力（Self-Attention）机制，使模型能够同时关注输入序列中的所有位置，彻底解决了 RNN 难以并行训练的问题。',
    concepts: [
      { term: 'Self-Attention', desc: '序列中每个位置直接关注所有其他位置，通过 Query-Key-Value 三元组计算注意力权重。' },
      { term: 'Multi-Head', desc: '将注意力机制拆分为多个并行的"头"，让模型从不同子空间中捕捉不同的语义关系。' },
      { term: 'Positional Encoding', desc: '由于无循环结构，通过正弦/余弦函数为输入注入位置信息，让模型感知词序。' },
      { term: 'Encoder-Decoder', desc: '编码器将输入序列编码为连续表示，解码器据此自回归地生成输出序列。' },
      { term: 'Feed-Forward Network', desc: '对每个位置独立施加两层全连接变换，增加非线性表达能力。' },
      { term: 'Layer Normalization', desc: '对每一层的输出做归一化，稳定深度网络的训练过程。' }
    ],
    knowledgeCards: [
      { title: '为什么注意力机制更高效？', content: 'RNN 必须逐字处理，像排队一样慢；而注意力机制让所有词同时"看"彼此，像开会讨论一样并行——计算路径长度从 O(n) 降为 O(1)。' },
      { title: 'Q、K、V 到底是什么？', content: '想象图书馆找书：Query 是你的搜索词，Key 是每本书的标签，Value 是书的内容。模型计算搜索词与每个标签的匹配度，加权汇总相关内容。' },
      { title: '多头注意力为何有用？', content: '就像用多把不同放大倍率的放大镜看同一幅画——有的看整体结构，有的看细节纹理。多个"头"让模型同时捕捉多种语义关系。' },
      { title: '为什么需要位置编码？', content: '注意力机制本身"不认识顺序"——"猫追狗"和"狗追猫"在它看来一样。位置编码给每个词贴上"座位号"，让模型知道谁先谁后。' }
    ],
    chapters: [
      {
        num: '1',
        title: '引言',
        tag: '背景',
        desc: '作者首先回顾了序列建模领域的主流方法：RNN、LSTM 和 GRU。这些模型在处理长序列时存在根本缺陷——必须逐字计算，无法并行化，且长距离依赖效果差。本文由此提出了一个大胆设想：能否完全抛弃循环结构，仅用注意力机制来建模序列？',
        insight: '这一章节奠定了整篇论文的动机：序列处理的瓶颈不在于"记住多少"，而在于"能否并行"。'
      },
      {
        num: '2',
        title: '背景与相关工作',
        tag: '综述',
        desc: '介绍了自注意力机制的前身（Extended Neural GPU、ByteNet 等），以及端到端记忆网络。指出这些方法虽部分使用了注意力，但仍依赖循环或卷积，未能彻底解决并行问题。',
        insight: 'Transformer 不是凭空出现的——它站在前人"部分使用注意力"的肩膀上，迈出了"完全依赖注意力"的关键一步。'
      },
      {
        num: '3',
        title: '模型架构',
        tag: '核心',
        desc: '详细描述了 Transformer 的整体结构：编码器和解码器各由 6 层堆叠而成。每层包含两个子模块——多头自注意力机制和前馈网络，均配合残差连接与 LayerNorm。编码器将输入序列编码为连续表示，解码器据此自回归地生成输出。',
        insight: '记住一个公式：子层输出 = LayerNorm(x + Sublayer(x))，这就是残差连接的精髓——让梯度"绕过"深层网络。'
      },
      {
        num: '4',
        title: '实验与结果',
        tag: '数据',
        highlight: true,
        desc: '在 WMT 2014 英德和英法翻译任务上测试。Transformer Big 模型达到 28.4 BLEU（英德）和 41.8 BLEU（英法），比当时最优结果提升 2.0+ BLEU，同时训练时间大幅缩短。下面用图表直观展示关键实验数据：',
        insight: '实验数据是这篇论文最有力的证明：更强的效果 + 更少的训练时间 = 注意力机制的胜利。',
        charts: [
          {
            title: '翻译质量对比（BLEU 分数，越高越好）',
            desc: 'Transformer Big 在英德和英法翻译任务上均超越了此前所有模型，包括集成方法。',
            type: 'bar',
            data: {
              categories: ['英德翻译', '英法翻译'],
              series: [
                { name: '此前最优', data: [26.30, 40.56] },
                { name: 'Transformer Base', data: [27.3, 38.1] },
                { name: 'Transformer Big', data: [28.4, 41.8] }
              ]
            }
          },
          {
            title: '训练效率对比（训练步数 vs 翻译质量）',
            desc: 'Transformer 用更少的训练步数达到了更高的 BLEU 分数，曲线上升更快更稳。',
            type: 'line',
            data: {
              categories: ['20K', '50K', '100K', '150K', '200K', '300K'],
              series: [
                { name: 'RNN+Attention', data: [12, 18, 22, 24, 25, 25.5] },
                { name: 'Transformer', data: [18, 24, 27, 28, 28.2, 28.4] }
              ]
            }
          },
          {
            title: '模型组件消融实验（BLEU 变化）',
            desc: '逐个移除 Transformer 的关键组件，观察翻译质量的下降幅度，验证每个设计的必要性。',
            type: 'bar',
            data: {
              categories: ['完整模型', '去掉多头', '去掉位置编码', '去掉残差', '去掉LayerNorm'],
              series: [
                { name: '英德翻译 BLEU', data: [28.4, 24.9, 26.2, 20.5, 22.1] }
              ]
            }
          }
        ]
      },
      {
        num: '5',
        title: '结论',
        tag: '总结',
        desc: 'Transformer 是首个完全基于注意力的序列转换模型，用多头自注意力取代了循环层。在翻译任务上达到 SOTA 的同时大幅提升训练效率。未来可拓展到图像、音频等其他模态。',
        insight: '作者当时的展望"可拓展到其他模态"——后来 Vision Transformer、Audio Transformer 的出现，完美印证了这个预言。'
      }
    ],
    games: {
      match: [
        { id: 'self-attention', term: 'Self-Attention', desc: '每个位置直接关注序列中所有其他位置' },
        { id: 'multi-head', term: 'Multi-Head', desc: '将注意力拆分为多个并行头捕捉不同语义' },
        { id: 'positional', term: 'Positional Encoding', desc: '用正弦余弦函数为输入注入位置信息' },
        { id: 'ffn', term: 'Feed-Forward Network', desc: '对每个位置独立施加两层全连接变换' }
      ],
      order: [
        { id: 1, text: '输入嵌入：将 token 转换为向量表示' },
        { id: 2, text: '位置编码：为向量加入位置信息' },
        { id: 3, text: '多头注意力：计算各位置间的关联权重' },
        { id: 4, text: '前馈网络：对每个位置做非线性变换' },
        { id: 5, text: '残差连接 + LayerNorm：稳定训练' }
      ],
      quiz: [
        {
          q: 'Transformer 架构最核心的创新是什么？',
          options: ['引入了卷积层来提取局部特征', '完全基于注意力机制，摒弃了循环结构', '使用了更深的网络层数', '采用了更大的词表'],
          correct: 1,
          explain: 'Transformer 完全依赖 Self-Attention 机制处理序列，无需 RNN 或 CNN，这是它最大的创新。'
        },
        {
          q: '为什么 Transformer 比传统 RNN 训练更快？',
          options: ['因为它使用了更少的参数', '因为它的计算量更小', '因为它可以并行处理所有位置，而非逐字处理', '因为它不需要梯度下降'],
          correct: 2,
          explain: 'RNN 必须按顺序逐字处理，而 Self-Attention 让所有位置同时计算，实现了真正的并行化。'
        },
        {
          q: 'Multi-Head Attention 的"多头"有什么作用？',
          options: ['增加模型的参数量', '让模型从不同子空间捕捉不同的语义关系', '加快计算速度', '防止过拟合'],
          correct: 1,
          explain: '多个头就像多把不同倍率的放大镜，各自关注不同维度的信息，最后合并得到更丰富的表示。'
        },
        {
          q: '为什么需要 Positional Encoding（位置编码）？',
          options: ['为了减少计算量', '为了增加模型深度', '因为注意力机制本身不包含位置信息，需要额外注入', '为了替代词嵌入'],
          correct: 2,
          explain: 'Self-Attention 对输入顺序不敏感，"猫追狗"和"狗追猫"在它看来一样。位置编码为每个词贴上"座位号"。'
        }
      ]
    }
  };

  // ==================== AI Prompt ====================

  var SYSTEM_PROMPT = '你是一个论文分析助手。请阅读用户提供的论文文本，并以严格的 JSON 格式返回分析结果。' +
    'JSON 必须包含以下字段：\n' +
    '{\n' +
    '  "paperInfo": {\n' +
    '    "title": "论文标题",\n' +
    '    "authors": "作者及机构及年份",\n' +
    '    "tags": [{"text": "标签", "color": "blue|purple|空"}]\n' +
    '  },\n' +
    '  "summary": "论文摘要（200-400字，可用HTML标签如<strong>和<mark class=\\"key\\">强调关键内容）",\n' +
    '  "keyContribution": "核心贡献（一句话总结）",\n' +
    '  "chapters": [\n' +
    '    {\n' +
    '      "num": "章节号",\n' +
    '      "title": "章节标题",\n' +
    '      "tag": "背景|综述|核心|数据|总结",\n' +
    '      "highlight": true或false,\n' +
    '      "desc": "该章节内容的通俗概述（100-200字）",\n' +
    '      "insight": "一句话通俗解读，用类比方式点明要点",\n' +
    '      "charts": [\n' +
    '        {\n' +
    '          "title": "图表标题",\n' +
    '          "desc": "图表说明，通俗解释数据含义",\n' +
    '          "type": "bar或line",\n' +
    '          "data": {\n' +
    '            "categories": ["类别1","类别2"],\n' +
    '            "series": [{"name": "系列名", "data": [数值1,数值2]}]\n' +
    '          }\n' +
    '        }\n' +
    '      ]\n' +
    '    }\n' +
    '  ],\n' +
    '  "concepts": [{"term": "术语", "desc": "通俗解释"}],\n' +
    '  "knowledgeCards": [{"title": "问题标题", "content": "用类比和比喻的通俗讲解"}],\n' +
    '  "games": {\n' +
    '    "match": [{"id": "唯一标识", "term": "术语", "desc": "解释"}],\n' +
    '    "order": [{"id": 序号, "text": "步骤描述"}],\n' +
    '    "quiz": [{"q": "问题", "options": ["选项A","选项B","选项C","选项D"], "correct": 正确选项索引, "explain": "解析"}]\n' +
    '  }\n' +
    '}\n' +
    '要求：\n' +
    '1. chapters 必须覆盖论文所有主要章节（4-6个），实验/结果章节必须设 highlight:true 并包含 charts\n' +
    '2. charts 中的数据要从论文实验部分提取真实数据（如准确率、BLEU分数、对比结果等），用通俗易懂的方式描述\n' +
    '3. concepts 提取4-6个核心概念\n' +
    '4. knowledgeCards 生成3-4个原理小知识，必须用生活化的比喻\n' +
    '5. match 游戏4对配对\n' +
    '6. order 游戏4-5个步骤的排序\n' +
    '7. quiz 游戏3-4道选择题\n' +
    '8. 只返回JSON，不要有其他文字';

  // ==================== 工具函数 ====================

  function $(id) { return document.getElementById(id); }

  function showView(viewName) {
    var views = document.querySelectorAll('.view');
    views.forEach(function (v) { v.classList.remove('active'); });
    $('view-' + viewName).classList.add('active');
  }

  function setProcStep(stepName, state) {
    var step = document.querySelector('.proc-step[data-step="' + stepName + '"]');
    if (!step) return;
    step.classList.remove('active', 'done');
    if (state) step.classList.add(state);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== PDF 文本提取 ====================

  function extractPdfText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var typedArray = new Uint8Array(e.target.result);
        // 使用 worker 模式加载 PDF
        var loadingTask = pdfjsLib.getDocument({ data: typedArray, useWorkerFetch: false, isEvalSupported: false });
        loadingTask.promise.then(function (pdf) {
          var totalPages = pdf.numPages;
          var pagePromises = [];
          var maxPages = Math.min(totalPages, 30); // 最多提取30页

          for (var i = 1; i <= maxPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then(function (page) {
                return page.getTextContent().then(function (content) {
                  var strings = content.items.map(function (item) {
                    return item.str;
                  });
                  return strings.join(' ');
                });
              })
            );
          }

          Promise.all(pagePromises).then(function (pages) {
            var fullText = pages.join('\n\n');
            resolve(fullText);
          }).catch(reject);
        }).catch(function (err) {
          // worker 模式失败，尝试禁用 worker 重试
          console.warn('PDF worker 模式失败，尝试主线程模式:', err);
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            var loadingTask2 = pdfjsLib.getDocument({ data: typedArray, disableWorker: true, useWorkerFetch: false, isEvalSupported: false });
            loadingTask2.promise.then(function (pdf) {
              var maxPages2 = Math.min(pdf.numPages, 30);
              var pagePromises2 = [];
              for (var i = 1; i <= maxPages2; i++) {
                pagePromises2.push(
                  pdf.getPage(i).then(function (page) {
                    return page.getTextContent().then(function (content) {
                      return content.items.map(function (item) { return item.str; }).join(' ');
                    });
                  })
                );
              }
              Promise.all(pagePromises2).then(function (pages) {
                resolve(pages.join('\n\n'));
              }).catch(reject);
            }).catch(reject);
          } catch (e) {
            reject(new Error('PDF 解析失败：' + (err.message || err) + '。建议尝试上传 TXT 格式的论文，或使用 Demo 模式。'));
          }
        });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function extractTxtText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ==================== AI API 调用 ====================

  // API 代理地址（部署后通过后端调用 AI，密钥不暴露在前端）
  var API_PROXY_URL = '/api/analyze';

  function getApiConfig() {
    // 本地开发时可通过设置面板自定义；生产环境走后端代理
    var customUrl = localStorage.getItem('pa_api_url');
    var customKey = localStorage.getItem('pa_api_key');
    if (customUrl && customKey) {
      return { url: customUrl, key: customKey, model: localStorage.getItem('pa_api_model') || 'deepseek-chat', direct: true };
    }
    return { url: API_PROXY_URL, key: '', model: 'deepseek-chat', direct: false };
  }

  function hasApiConfig() {
    return true; // 生产环境始终可用（后端代理）
  }

  function callAiApi(paperText) {
    var config = getApiConfig();
    // 截取前12000字符，避免超出token限制
    var truncatedText = paperText.substring(0, 12000);

    var headers = { 'Content-Type': 'application/json' };
    var body;

    if (config.direct) {
      // 本地直连模式（开发用）
      headers['Authorization'] = 'Bearer ' + config.key;
      body = JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '请分析以下论文文本并返回JSON结果：\n\n' + truncatedText }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
    } else {
      // 后端代理模式（生产用）
      body = JSON.stringify({
        type: 'analyze',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '请分析以下论文文本并返回JSON结果：\n\n' + truncatedText }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
    }

    return fetch(config.url, {
      method: 'POST',
      headers: headers,
      body: body
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error('API错误 (' + res.status + '): ' + (err.error ? err.error.message : res.statusText));
        });
      }
      return res.json();
    }).then(function (data) {
      var content = data.choices[0].message.content;
      // 尝试从返回内容中提取JSON
      var jsonStr = content;
      // 移除可能的 markdown 代码块标记
      if (jsonStr.indexOf('```json') !== -1) {
        jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonStr.indexOf('```') !== -1) {
        jsonStr = jsonStr.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      jsonStr = jsonStr.trim();
      return JSON.parse(jsonStr);
    });
  }

  // ==================== 文件大小限制 ====================
  // PDF 文件限制 20MB，TXT 文件限制 5MB，超出则直接报错，避免无效上传与 AI 接口浪费
  var MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
  var MAX_TXT_SIZE = 5 * 1024 * 1024;  // 5MB

  function checkFileSize(file) {
    if (!file) return null;
    var isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    var isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    var sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (isPdf && file.size > MAX_PDF_SIZE) {
      return '文件过大！PDF 文件限制为 20MB，当前文件大小为 ' + sizeMB + 'MB。请压缩 PDF 后重试，或上传 TXT 格式的论文。';
    }
    if (isTxt && file.size > MAX_TXT_SIZE) {
      return '文件过大！TXT 文件限制为 5MB，当前文件大小为 ' + sizeMB + 'MB。请精简内容后重试。';
    }
    // 其它类型文件也做兜底限制（按 20MB）
    if (!isPdf && !isTxt && file.size > MAX_PDF_SIZE) {
      return '文件过大！当前文件大小为 ' + sizeMB + 'MB，已超出 20MB 上限。';
    }
    return null;
  }

  // ==================== 处理流程 ====================

  async function processPaper(file) {
    showView('processing');
    $('proc-error').classList.remove('show');
    $('proc-title').textContent = '正在解析论文...';
    $('proc-subtitle').textContent = file ? file.name : 'Demo 模式';

    // 文件大小限制检查（在真正开始解析前拦截）
    if (file) {
      var sizeErr = checkFileSize(file);
      if (sizeErr) {
        $('proc-error').textContent = sizeErr;
        $('proc-error').classList.add('show');
        $('proc-title').textContent = '文件过大';
        $('proc-subtitle').textContent = '请选择更小的文件后重试';
        // 重置所有步骤状态（避免显示进行中的假象）
        ['extract', 'clean', 'understand', 'generate', 'games'].forEach(function (s) {
          setProcStep(s, null);
        });
        return;
      }
    }

    // 重置步骤
    ['extract', 'clean', 'understand', 'generate', 'games'].forEach(function (s) {
      setProcStep(s, null);
    });

    try {
      var paperText = '';

      // 步骤1: 文本提取
      setProcStep('extract', 'active');
      if (file) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          paperText = await extractPdfText(file);
        } else {
          paperText = await extractTxtText(file);
        }
      }
      await sleep(500);
      setProcStep('extract', 'done');

      // 步骤2: 内容清洗
      setProcStep('clean', 'active');
      await sleep(400);
      setProcStep('clean', 'done');

      var result;

      if (paperText) {
        // 步骤3: 语义理解（调用AI）
        setProcStep('understand', 'active');
        $('proc-title').textContent = 'AI 正在理解论文...';
        try {
          result = await callAiAPIWithTimeout(paperText);
        } catch (apiErr) {
          // AI调用失败，显示错误但允许使用Demo
          throw new Error('AI 接口调用失败：' + apiErr.message + '\n\n您可以：\n1. 检查 API 配置是否正确\n2. 点击"体验 Demo"查看示例效果');
        }
        setProcStep('understand', 'done');

        // 步骤4: 知识生成
        setProcStep('generate', 'active');
        $('proc-title').textContent = '正在生成知识卡片...';
        await sleep(600);
        setProcStep('generate', 'done');

        // 步骤5: 游戏生成
        setProcStep('games', 'active');
        $('proc-title').textContent = '正在生成互动游戏...';
        await sleep(500);
        setProcStep('games', 'done');
      } else {
        // Demo 模式
        setProcStep('understand', 'active');
        $('proc-title').textContent = '正在理解论文（Demo 模式）...';
        await sleep(800);
        setProcStep('understand', 'done');

        setProcStep('generate', 'active');
        $('proc-title').textContent = '正在生成知识卡片...';
        await sleep(600);
        setProcStep('generate', 'done');

        setProcStep('games', 'active');
        $('proc-title').textContent = '正在生成互动游戏...';
        await sleep(500);
        setProcStep('games', 'done');

        result = DEMO_DATA;
      }

      // 渲染结果
      renderResults(result);
      showView('results');
      $('btn-new-paper').style.display = 'inline-flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      $('proc-error').textContent = err.message;
      $('proc-error').classList.add('show');
      $('proc-title').textContent = '处理失败';
      $('proc-subtitle').textContent = '请检查错误信息或重试';
    }
  }

  // 带超时的AI调用
  function callAiAPIWithTimeout(paperText) {
    return new Promise(function (resolve, reject) {
      var timeout = setTimeout(function () {
        reject(new Error('AI 接口响应超时（60秒），请检查网络或稍后重试'));
      }, 60000);

      callAiApi(paperText).then(function (result) {
        clearTimeout(timeout);
        resolve(result);
      }).catch(function (err) {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // ==================== 结果渲染 ====================

  function renderResults(data) {
    // Paper Info
    var info = data.paperInfo || {};
    var tagsHtml = (info.tags || []).map(function (t) {
      return '<span class="tag ' + (t.color || '') + '">' + escapeHtml(t.text) + '</span>';
    }).join('');
    $('paper-info').innerHTML =
      '<div class="paper-thumb">📄</div>' +
      '<div class="paper-meta">' +
      '<h3>' + escapeHtml(info.title || '未知论文') + '</h3>' +
      '<div class="authors">' + escapeHtml(info.authors || '') + '</div>' +
      '<div class="tags">' + tagsHtml + '</div>' +
      '</div>';

    // Summary
    var summaryHtml = '<p>' + (data.summary || '') + '</p>';
    if (data.keyContribution) {
      summaryHtml += '<div class="highlight-box"><strong>' + escapeHtml(data.keyContribution) + '</strong></div>';
    }
    $('summary-text').innerHTML = summaryHtml;

    // Concepts
    var conceptsHtml = (data.concepts || []).map(function (c, i) {
      return '<div class="concept-item" id="concept-wrap-' + i + '">' +
        '<div class="concept-term">' + escapeHtml(c.term) + '</div>' +
        '<div class="concept-desc">' + escapeHtml(c.desc) + '</div>' +
        '</div>';
    }).join('');
    $('concept-list').innerHTML = conceptsHtml;

    // Knowledge Cards
    var cardsHtml = (data.knowledgeCards || []).map(function (k, i) {
      return '<div class="knowledge-card" id="kc-wrap-' + i + '">' +
        '<div class="kc-label">💡 原理卡片</div>' +
        '<h4>' + escapeHtml(k.title) + '</h4>' +
        '<p>' + escapeHtml(k.content) + '</p>' +
        '</div>';
    }).join('');
    $('knowledge-grid').innerHTML = cardsHtml;

    // Chapters
    renderChapters(data.chapters || []);

    // 初始化游戏
    var games = data.games || {};
    if (window.PaperGames) {
      window.PaperGames.init(games);
    }

    // 通知 features 模块（保存到论文库、渲染笔记、重置进度）
    if (window.PaperFeatures) {
      window.PaperFeatures.setData(data);
    }

    // 添加语音按钮到知识卡片
    if (window.addVoiceButtons) {
      setTimeout(window.addVoiceButtons, 500);
    }

    // 隐藏对比和推荐区（新论文时重置）
    var compareSec = document.getElementById('compare-section');
    var recSec = document.getElementById('recommend-section');
    if (compareSec) compareSec.style.display = 'none';
    if (recSec) recSec.style.display = 'none';
  }

  // 暴露给分享链接和论文库使用
  window.renderResultsFromShare = function (data) {
    renderResults(data);
    showView('results');
    $('btn-new-paper').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== 章节渲染 ====================

  // 存储当前章节图表数据，供 ECharts 渲染使用
  var pendingCharts = [];

  function renderChapters(chapters) {
    pendingCharts = [];
    var list = $('chapter-list');

    if (!chapters || chapters.length === 0) {
      list.innerHTML = '<div class="chart-plain">暂无章节数据</div>';
      return;
    }

    var html = chapters.map(function (ch, idx) {
      var highlightCls = ch.highlight ? ' highlight' : '';
      var openCls = ch.highlight ? ' open' : '';

      var chartsHtml = '';
      if (ch.charts && ch.charts.length > 0) {
        chartsHtml = ch.charts.map(function (chart, ci) {
          var chartId = 'chapter-chart-' + idx + '-' + ci;
          pendingCharts.push({ id: chartId, chart: chart });
          return '<div class="chapter-chart">' +
            '<div class="chart-title">' + escapeHtml(chart.title) + '</div>' +
            '<div class="chart-desc">' + escapeHtml(chart.desc) + '</div>' +
            '<div class="chart-container" id="' + chartId + '"></div>' +
            '</div>';
        }).join('');
      }

      var insightHtml = ch.insight
        ? '<div class="chapter-insight"><strong>💡 通俗解读：</strong>' + escapeHtml(ch.insight) + '</div>'
        : '';

      return '<div class="chapter-card' + highlightCls + openCls + '" data-idx="' + idx + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">CH.' + escapeHtml(ch.num) + '</span>' +
        '<span class="chapter-title">' + escapeHtml(ch.title) + '</span>' +
        (ch.tag ? '<span class="chapter-tag">' + escapeHtml(ch.tag) + '</span>' : '') +
        '<span class="chapter-toggle">▶</span>' +
        '</div>' +
        '<div class="chapter-body">' +
        '<div class="chapter-desc" id="chapter-desc-' + idx + '">' + escapeHtml(ch.desc) + '</div>' +
        insightHtml +
        chartsHtml +
        '</div>' +
        '</div>';
    }).join('');

    list.innerHTML = html;

    // 绑定章节折叠点击
    var cards = list.querySelectorAll('.chapter-header');
    cards.forEach(function (header) {
      header.addEventListener('click', function () {
        var card = header.parentElement;
        card.classList.toggle('open');
        // 展开 时渲染图表
        if (card.classList.contains('open')) {
          setTimeout(renderPendingCharts, 100);
        }
      });
    });

    // 渲染已展开章节的图表
    setTimeout(renderPendingCharts, 200);
  }

  // ==================== ECharts 图表渲染 ====================

  function renderPendingCharts() {
    if (typeof echarts === 'undefined') return;
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var accent2 = style.getPropertyValue('--accent2').trim();
    var muted = style.getPropertyValue('--muted').trim();
    var ink = style.getPropertyValue('--ink').trim();
    var rule = style.getPropertyValue('--rule').trim();
    var bg2 = style.getPropertyValue('--bg2').trim();

    pendingCharts.forEach(function (item) {
      var el = document.getElementById(item.id);
      if (!el || el.getAttribute('data-rendered')) return;
      // 只渲染可见的图表（父元素已展开）
      if (el.offsetParent === null) return;

      var chart = item.chart;
      var colorPalette = [accent, accent2, muted, accent + '99', accent2 + '99'];

      var option = {
        color: colorPalette,
        textStyle: { color: ink, fontFamily: 'InstrumentSans, sans-serif' },
        tooltip: {
          trigger: 'axis',
          appendToBody: true,
          backgroundColor: bg2,
          borderColor: rule,
          textStyle: { color: ink }
        },
        legend: {
          data: chart.data.series.map(function (s) { return s.name; }),
          textStyle: { color: muted },
          top: 0
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
        xAxis: {
          type: 'category',
          data: chart.data.categories,
          axisLine: { lineStyle: { color: rule } },
          axisLabel: { color: muted, fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: rule } },
          axisLabel: { color: muted, fontSize: 11 },
          splitLine: { lineStyle: { color: rule, type: 'dashed' } }
        },
        series: chart.data.series.map(function (s) {
          return {
            name: s.name,
            type: chart.type === 'line' ? 'line' : 'bar',
            data: s.data,
            smooth: chart.type === 'line',
            itemStyle: { borderRadius: chart.type === 'bar' ? [4, 4, 0, 0] : 0 },
            label: { show: true, position: 'top', color: muted, fontSize: 10 }
          };
        })
      };

      try {
        var instance = echarts.init(el, null, { renderer: 'svg' });
        instance.setOption(option);
        el.setAttribute('data-rendered', '1');
        window.addEventListener('resize', function () { instance.resize(); });
      } catch (e) {
        el.innerHTML = '<div class="chart-plain">图表渲染失败：' + escapeHtml(e.message) + '</div>';
      }
    });
  }

  // ==================== 风格切换 ====================

  function initStyleSwitcher() {
    var buttons = document.querySelectorAll('.style-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var style = btn.getAttribute('data-style');
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.body.setAttribute('data-theme', style);
        // 重新渲染图表（颜色需要更新）
        pendingCharts.forEach(function (item) {
          var el = document.getElementById(item.id);
          if (el) el.removeAttribute('data-rendered');
        });
        setTimeout(renderPendingCharts, 300);
      });
    });
  }

  // ==================== 事件绑定 ====================

  function initEvents() {
    // 风格切换
    initStyleSwitcher();

    // 上传区域点击
    var uploadZone = $('upload-zone');
    var fileInput = $('file-input');

    uploadZone.addEventListener('click', function () {
      fileInput.click();
    });
    $('btn-select-file').addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', function (e) {
      if (e.target.files.length > 0) {
        processPaper(e.target.files[0]);
      }
    });

    // 拖拽上传
    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', function () {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        processPaper(e.dataTransfer.files[0]);
      }
    });

    // Demo 按钮
    $('btn-demo').addEventListener('click', function () {
      processPaper(null);
    });

    // 上传新论文
    $('btn-new-paper').addEventListener('click', function () {
      showView('upload');
      $('btn-new-paper').style.display = 'none';
      fileInput.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 设置面板
    $('settings-toggle').addEventListener('click', function () {
      $('settings-panel').classList.toggle('open');
    });

    // 模型选择
    $('api-model').addEventListener('change', function (e) {
      $('custom-model-row').style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

    // 保存设置
    $('btn-save-settings').addEventListener('click', function () {
      var url = $('api-url').value.trim();
      var key = $('api-key').value.trim();
      var modelSel = $('api-model').value;
      var model = modelSel === 'custom' ? $('custom-model').value.trim() : modelSel;

      if (url) localStorage.setItem('pa_api_url', url);
      if (key) localStorage.setItem('pa_api_key', key);
      if (model) localStorage.setItem('pa_api_model', model);

      updateApiStatus();
      $('settings-panel').classList.remove('open');
    });

    // 游戏Tab切换
    var gameTabs = document.querySelectorAll('.game-tab');
    var gamePanels = document.querySelectorAll('.game-panel');
    gameTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-game');
        gameTabs.forEach(function (t) { t.classList.remove('active'); });
        gamePanels.forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        $('game-' + target).classList.add('active');
      });
    });
  }

  function updateApiStatus() {
    var badge = $('api-status-badge');
    var config = getApiConfig();
    if (config.direct) {
      badge.className = 'api-status ok';
      badge.textContent = 'API 直连模式';
    } else {
      badge.className = 'api-status ok';
      badge.textContent = 'API 已就绪';
    }
  }

  function loadSavedSettings() {
    var config = getApiConfig();
    if (config.url) $('api-url').value = config.url;
    if (config.key) $('api-key').value = config.key;
    if (config.model) {
      var modelSelect = $('api-model');
      var found = false;
      for (var i = 0; i < modelSelect.options.length; i++) {
        if (modelSelect.options[i].value === config.model) {
          modelSelect.value = config.model;
          found = true;
          break;
        }
      }
      if (!found) {
        modelSelect.value = 'custom';
        $('custom-model-row').style.display = 'block';
        $('custom-model').value = config.model;
      }
    }
  }

  // ==================== 初始化 ====================

  document.addEventListener('DOMContentLoaded', function () {
    // 清除旧的 localStorage 配置，确保使用新的 DeepSeek 默认配置
    localStorage.removeItem('pa_api_url');
    localStorage.removeItem('pa_api_key');
    localStorage.removeItem('pa_api_model');
    loadSavedSettings();
    updateApiStatus();
    initEvents();
  });
})();
