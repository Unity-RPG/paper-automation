/**
 * 论文自动化 · 趣味互动游戏逻辑
 * 支持动态数据：通过 PaperGames.init(gamesData) 初始化
 * 三个游戏：概念连连看 / 流程排序挑战 / 知识问答
 */
(function () {
  'use strict';

  // ==================== 工具函数 ====================

  function $(id) { return document.getElementById(id); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ==================== 游戏1：概念连连看 ====================

  var matchState = {};

  function initMatchGame(matchData) {
    var leftCol = $('match-left');
    var rightCol = $('match-right');
    leftCol.innerHTML = '';
    rightCol.innerHTML = '';
    $('match-result').innerHTML = '';
    $('match-total').textContent = matchData.length;
    $('match-score').textContent = '0';
    $('match-wrong').textContent = '0';

    matchState = {
      selectedLeft: null,
      selectedRight: null,
      matched: 0,
      wrong: 0,
      total: matchData.length,
      data: matchData
    };

    // 左侧：术语（原始顺序）
    matchData.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'match-item';
      el.setAttribute('data-id', item.id);
      el.setAttribute('data-side', 'left');
      el.innerHTML = '<span class="term-label">' + escapeHtml(item.term) + '</span>';
      el.addEventListener('click', function () { onMatchClick(el, 'left'); });
      leftCol.appendChild(el);
    });

    // 右侧：解释（打乱顺序）
    var shuffled = shuffle(matchData);
    shuffled.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'match-item';
      el.setAttribute('data-id', item.id);
      el.setAttribute('data-side', 'right');
      el.innerHTML = '<span class="term-desc">' + escapeHtml(item.desc) + '</span>';
      el.addEventListener('click', function () { onMatchClick(el, 'right'); });
      rightCol.appendChild(el);
    });
  }

  function onMatchClick(el, side) {
    if (el.classList.contains('matched')) return;

    var sameSide = document.querySelectorAll('.match-item[data-side="' + side + '"].selected');
    sameSide.forEach(function (s) { s.classList.remove('selected'); });

    el.classList.add('selected');

    if (side === 'left') {
      matchState.selectedLeft = el;
    } else {
      matchState.selectedRight = el;
    }

    if (matchState.selectedLeft && matchState.selectedRight) {
      var leftId = matchState.selectedLeft.getAttribute('data-id');
      var rightId = matchState.selectedRight.getAttribute('data-id');

      if (leftId === rightId) {
        matchState.selectedLeft.classList.remove('selected');
        matchState.selectedLeft.classList.add('matched');
        matchState.selectedRight.classList.remove('selected');
        matchState.selectedRight.classList.add('matched');
        matchState.matched++;
        $('match-score').textContent = matchState.matched;
        matchState.selectedLeft = null;
        matchState.selectedRight = null;

        if (matchState.matched === matchState.total) {
          showMatchResult();
        }
      } else {
        matchState.selectedLeft.classList.add('wrong-flash');
        matchState.selectedRight.classList.add('wrong-flash');
        matchState.wrong++;
        $('match-wrong').textContent = matchState.wrong;

        var leftEl = matchState.selectedLeft;
        var rightEl = matchState.selectedRight;
        setTimeout(function () {
          leftEl.classList.remove('wrong-flash', 'selected');
          rightEl.classList.remove('wrong-flash', 'selected');
        }, 600);

        matchState.selectedLeft = null;
        matchState.selectedRight = null;
      }
    }
  }

  function showMatchResult() {
    var wrong = matchState.wrong;
    var emoji = wrong === 0 ? '🏆' : wrong <= 2 ? '🎉' : '💪';
    var msg = wrong === 0 ? '完美！你对核心概念了如指掌！' :
              wrong <= 2 ? '很棒！大部分概念都掌握了呢。' :
              '继续加油，多看几遍原理卡片就懂了！';
    $('match-result').innerHTML =
      '<div class="game-result">' +
      '<div class="result-emoji">' + emoji + '</div>' +
      '<div class="result-score">' + matchState.matched + '/' + matchState.total + ' 配对成功</div>' +
      '<div class="result-msg">' + msg + '（错误次数：' + wrong + '）</div>' +
      '<button class="btn btn-primary" id="match-replay">再玩一次</button>' +
      '</div>';
    $('match-replay').addEventListener('click', function () {
      initMatchGame(matchState.data);
    });
  }

  // ==================== 游戏2：流程排序 ====================

  var orderState = {};

  function initOrderGame(orderData) {
    var list = $('order-list');
    list.innerHTML = '';
    $('order-correct').textContent = '-';
    $('order-feedback').innerHTML = '';
    $('order-total').textContent = orderData.length;

    orderState = {
      items: shuffle(orderData),
      data: orderData,
      draggedIndex: null
    };

    renderOrderList();
  }

  function renderOrderList() {
    var list = $('order-list');
    list.innerHTML = '';

    orderState.items.forEach(function (item, index) {
      var el = document.createElement('div');
      el.className = 'order-item';
      el.setAttribute('draggable', 'true');
      el.setAttribute('data-index', index);
      el.innerHTML =
        '<span class="drag-handle">⠿</span>' +
        '<span class="order-num">' + (index + 1) + '</span>' +
        '<span>' + escapeHtml(item.text) + '</span>';

      el.addEventListener('dragstart', function (e) {
        orderState.draggedIndex = index;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', function () {
        el.classList.remove('dragging');
      });
      el.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        var fromIndex = orderState.draggedIndex;
        var toIndex = index;
        if (fromIndex !== toIndex) {
          var moved = orderState.items.splice(fromIndex, 1)[0];
          orderState.items.splice(toIndex, 0, moved);
          renderOrderList();
        }
      });

      list.appendChild(el);
    });
  }

  function checkOrder() {
    if (!orderState.items) return;
    var correctCount = 0;
    var items = document.querySelectorAll('#order-list .order-item');
    items.forEach(function (el, index) {
      el.classList.remove('correct', 'wrong');
      if (orderState.items[index].id === index + 1) {
        el.classList.add('correct');
        correctCount++;
      } else {
        el.classList.add('wrong');
      }
    });

    $('order-correct').textContent = correctCount;

    var feedback = $('order-feedback');
    var total = orderState.data.length;
    var emoji = correctCount === total ? '🏆' : correctCount >= total - 1 ? '🎉' : '💪';
    var msg = correctCount === total ? '完美！你已经掌握了完整计算流程！' :
              correctCount >= total - 1 ? '非常接近！再调整一下就对了。' :
              '别灰心，回顾一下流程图再试试。';
    feedback.innerHTML =
      '<div class="quiz-feedback ' + (correctCount === total ? 'correct' : 'wrong') + ' show">' +
      emoji + ' ' + msg + '（正确 ' + correctCount + '/' + total + '）' +
      '</div>';
  }

  // ==================== 游戏3：知识问答 ====================

  var quizState = {};

  function initQuizGame(quizData) {
    quizState = { current: 0, score: 0, answered: false, data: quizData };
    $('quiz-score').textContent = '0';
    $('quiz-next').style.display = 'none';
    $('quiz-restart').style.display = 'none';
    $('quiz-total').textContent = quizData.length;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    var q = quizState.data[quizState.current];
    $('quiz-current').textContent = quizState.current + 1;
    quizState.answered = false;

    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    var optionsHtml = q.options.map(function (opt, i) {
      return '<div class="quiz-option" data-index="' + i + '">' +
        '<span class="opt-letter">' + letters[i] + '</span>' +
        '<span>' + escapeHtml(opt) + '</span>' +
        '</div>';
    }).join('');

    $('quiz-content').innerHTML =
      '<div class="quiz-question"><span class="q-num">Q' + (quizState.current + 1) + '</span>' + escapeHtml(q.q) + '</div>' +
      '<div class="quiz-options">' + optionsHtml + '</div>' +
      '<div class="quiz-feedback" id="quiz-feedback"></div>';

    var opts = document.querySelectorAll('#quiz-content .quiz-option');
    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (quizState.answered) return;
        quizState.answered = true;
        var chosen = parseInt(opt.getAttribute('data-index'));
        var correctIdx = q.correct;

        opts.forEach(function (o) {
          o.classList.add('disabled');
          var idx = parseInt(o.getAttribute('data-index'));
          if (idx === correctIdx) o.classList.add('correct');
          if (idx === chosen && chosen !== correctIdx) o.classList.add('wrong');
        });

        var feedback = $('quiz-feedback');
        if (chosen === correctIdx) {
          quizState.score++;
          $('quiz-score').textContent = quizState.score;
          feedback.className = 'quiz-feedback correct show';
          feedback.innerHTML = '✅ 回答正确！' + escapeHtml(q.explain);
        } else {
          feedback.className = 'quiz-feedback wrong show';
          feedback.innerHTML = '❌ 答错了。' + escapeHtml(q.explain);
        }

        if (quizState.current < quizState.data.length - 1) {
          $('quiz-next').style.display = 'inline-flex';
        } else {
          showQuizResult();
        }
      });
    });
  }

  function showQuizResult() {
    $('quiz-next').style.display = 'none';
    var total = quizState.data.length;
    var score = quizState.score;
    var emoji = score === total ? '🏆' : score >= total - 1 ? '🎉' : '💪';
    var msg = score === total ? '满分！你对这篇论文的理解非常透彻！' :
              score >= total - 1 ? '很棒！绝大部分内容都掌握了。' :
              '继续加油，多看看原理卡片和概念解析吧！';

    $('quiz-content').innerHTML =
      '<div class="game-result">' +
      '<div class="result-emoji">' + emoji + '</div>' +
      '<div class="result-score">' + score + '/' + total + ' 正确</div>' +
      '<div class="result-msg">' + msg + '</div>' +
      '</div>';
    $('quiz-restart').style.display = 'inline-flex';
  }

  // ==================== HTML转义 ====================

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== 事件绑定（仅绑一次） ====================

  var eventsBound = false;

  function bindGameEvents() {
    if (eventsBound) return;
    eventsBound = true;

    $('order-check').addEventListener('click', checkOrder);
    $('order-reset').addEventListener('click', function () {
      if (orderState.data) initOrderGame(orderState.data);
    });
    $('quiz-next').addEventListener('click', function () {
      quizState.current++;
      renderQuizQuestion();
      $('quiz-next').style.display = 'none';
    });
    $('quiz-restart').addEventListener('click', function () {
      if (quizState.data) initQuizGame(quizState.data);
    });
  }

  // ==================== 对外接口 ====================

  window.PaperGames = {
    init: function (gamesData) {
      bindGameEvents();

      var match = gamesData.match || [];
      var order = gamesData.order || [];
      var quiz = gamesData.quiz || [];

      if (match.length > 0) initMatchGame(match);
      if (order.length > 0) initOrderGame(order);
      if (quiz.length > 0) initQuizGame(quiz);
    }
  };
})();
