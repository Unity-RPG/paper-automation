/**
 * supabase.js — Supabase 用户系统与论文库云端同步（功能5）
 *
 * ---------------------------------------------------------------------------
 * 使用前配置（必读）：
 * 1. 在 https://supabase.com 注册并创建一个项目
 * 2. 进入 项目设置 → API，复制 Project URL 与 anon public Key
 * 3. 将下方 SUPABASE_URL、SUPABASE_KEY 替换为你的真实值
 * 4. 在 Supabase 的 SQL Editor 中执行以下建表语句：
 *
 *    create table if not exists papers (
 *      id uuid default gen_random_uuid() primary key,
 *      user_id uuid references auth.users(id) on delete cascade,
 *      paper_id text,
 *      title text,
 *      authors text,
 *      data jsonb,
 *      created_at timestamptz default now()
 *    );
 *
 *    -- 启用行级安全（RLS），只允许用户访问自己的论文
 *    alter table papers enable row level security;
 *    create policy "用户可读自己的论文" on papers
 *      for select using (auth.uid() = user_id);
 *    create policy "用户可写自己的论文" on papers
 *      for insert with check (auth.uid() = user_id);
 *    create policy "用户可更新自己的论文" on papers
 *      for update using (auth.uid() = user_id);
 *    create policy "用户可删除自己的论文" on papers
 *      for delete using (auth.uid() = user_id);
 *
 * 5. 在 Authentication → Providers 中开启 Email 认证即可
 *
 * 未配置时（URL/KEY 仍为占位符），本模块自动降级：
 *   - 登录/注册按钮可用但会提示未配置
 *   - 论文库仍使用 localStorage（由 features.js 处理）
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // ====== 配置（请替换为你的真实值） ======
  var SUPABASE_URL = 'https://wyugalbmycckmzimagjy.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_K8TWSvMrsdKg_Knu5Zj2XA_dLNYFC8P';
  // ========================================

  var client = null;
  var currentUser = null;
  var authCallbacks = [];

  function isConfigured() {
    return SUPABASE_URL && SUPABASE_KEY &&
      SUPABASE_URL.indexOf('YOUR_') === -1 &&
      SUPABASE_KEY.indexOf('YOUR_') === -1;
  }

  function getClient() {
    if (client) return client;
    if (!isConfigured()) return null;
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.error('Supabase JS SDK 未加载，请确认 index.html 已引入 @supabase/supabase-js');
      return null;
    }
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      console.error('Supabase 客户端初始化失败:', e);
      client = null;
    }
    return client;
  }

  function notifyAuthChange() {
    authCallbacks.forEach(function (cb) {
      try { cb(currentUser); } catch (e) { console.error(e); }
    });
    updateAuthUI();
  }

  // ==================== 认证 ====================

  async function signUp(email, password) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase 未配置，请先填写 SUPABASE_URL 与 SUPABASE_KEY。');
    var res = await sb.auth.signUp({ email: email, password: password });
    if (res.error) throw res.error;
    // signUp 后可能需要邮箱验证；若直接返回 session 则已登录
    if (res.data && res.data.user) {
      currentUser = res.data.user;
      notifyAuthChange();
    }
    return res.data;
  }

  async function signIn(email, password) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase 未配置，请先填写 SUPABASE_URL 与 SUPABASE_KEY。');
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    currentUser = res.data.user;
    notifyAuthChange();
    return res.data;
  }

  async function signOut() {
    var sb = getClient();
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) { /* ignore */ }
    }
    currentUser = null;
    notifyAuthChange();
  }

  async function restoreSession() {
    var sb = getClient();
    if (!sb) { updateAuthUI(); return; }
    try {
      var res = await sb.auth.getSession();
      if (res.data && res.data.session && res.data.session.user) {
        currentUser = res.data.session.user;
      }
    } catch (e) {
      console.error('恢复会话失败:', e);
    }
    // 监听后续认证状态变化
    try {
      sb.auth.onAuthStateChange(function (_event, session) {
        currentUser = (session && session.user) || null;
        notifyAuthChange();
      });
    } catch (e) { /* ignore */ }
    notifyAuthChange();
  }

  function isLoggedIn() { return !!currentUser; }
  function getCurrentUser() { return currentUser; }
  function onAuthChange(cb) { authCallbacks.push(cb); }

  // ==================== 顶部栏 UI 更新 ====================

  function updateAuthUI() {
    var userArea = $('user-area');
    var userEmail = $('user-email');
    var btnLogin = $('btn-login');
    var btnRegister = $('btn-register');
    if (!userArea) return;

    if (currentUser) {
      userArea.style.display = 'inline-flex';
      if (userEmail) userEmail.textContent = currentUser.email || '';
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnRegister) btnRegister.style.display = 'none';
    } else {
      userArea.style.display = 'none';
      if (userEmail) userEmail.textContent = '';
      if (btnLogin) btnLogin.style.display = 'inline-flex';
      if (btnRegister) btnRegister.style.display = 'inline-flex';
    }
  }

  // ==================== 论文库云端同步 ====================

  // 返回数组，元素结构与 localStorage 中一致：{ id, title, authors, date, data }
  async function loadPapers() {
    var sb = getClient();
    if (!sb || !currentUser) return [];
    var res = await sb
      .from('papers')
      .select('paper_id, title, authors, data, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (row) {
      var d = row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '';
      return {
        id: row.paper_id,
        title: row.title,
        authors: row.authors,
        date: d,
        data: row.data
      };
    });
  }

  // 保存（按标题去重后插入，与本地行为一致）
  async function savePaper(paper) {
    var sb = getClient();
    if (!sb || !currentUser) throw new Error('未登录');
    // 先删除同标题旧记录，保证去重
    var del = await sb
      .from('papers')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('title', paper.title);
    if (del.error) throw del.error;
    var ins = await sb
      .from('papers')
      .insert([{
        user_id: currentUser.id,
        paper_id: paper.id,
        title: paper.title,
        authors: paper.authors,
        data: paper.data
      }]);
    if (ins.error) throw ins.error;
    return true;
  }

  async function deletePaper(paperId) {
    var sb = getClient();
    if (!sb || !currentUser) throw new Error('未登录');
    var res = await sb
      .from('papers')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('paper_id', paperId);
    if (res.error) throw res.error;
    return true;
  }

  // ==================== 暴露 API ====================

  window.PaperAuth = {
    isConfigured: isConfigured,
    isLoggedIn: isLoggedIn,
    getCurrentUser: getCurrentUser,
    onAuthChange: onAuthChange,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    restoreSession: restoreSession,
    loadPapers: loadPapers,
    savePaper: savePaper,
    deletePaper: deletePaper
  };

  // ==================== 登录/注册模态框交互 ====================

  document.addEventListener('DOMContentLoaded', function () {
    var authModal = $('auth-modal');
    var authTitle = $('auth-modal-title');
    var authSubmit = $('auth-submit');
    var authSwitchText = $('auth-switch-text');
    var authSwitchLink = $('auth-switch-link');
    var authError = $('auth-error');
    var mode = 'login'; // login | register

    function openAuth(m) {
      mode = m;
      if (authError) { authError.style.display = 'none'; authError.textContent = ''; }
      if (m === 'register') {
        if (authTitle) authTitle.textContent = '注册';
        if (authSubmit) authSubmit.textContent = '注册';
        if (authSwitchText) authSwitchText.textContent = '已有账号？';
        if (authSwitchLink) authSwitchLink.textContent = '去登录';
      } else {
        if (authTitle) authTitle.textContent = '登录';
        if (authSubmit) authSubmit.textContent = '登录';
        if (authSwitchText) authSwitchText.textContent = '还没有账号？';
        if (authSwitchLink) authSwitchLink.textContent = '去注册';
      }
      if (authModal) authModal.classList.add('open');
    }

    function closeAuth() {
      if (authModal) authModal.classList.remove('open');
    }

    function showAuthError(msg) {
      if (!authError) { alert(msg); return; }
      authError.textContent = msg;
      authError.style.display = 'block';
    }

    if ($('btn-login')) $('btn-login').addEventListener('click', function () { openAuth('login'); });
    if ($('btn-register')) $('btn-register').addEventListener('click', function () { openAuth('register'); });
    if ($('auth-close')) $('auth-close').addEventListener('click', closeAuth);
    if (authModal) authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeAuth();
    });
    if (authSwitchLink) authSwitchLink.addEventListener('click', function (e) {
      e.preventDefault();
      openAuth(mode === 'login' ? 'register' : 'login');
    });

    if (authSubmit) authSubmit.addEventListener('click', async function () {
      var email = $('auth-email') ? $('auth-email').value.trim() : '';
      var password = $('auth-password') ? $('auth-password').value : '';
      if (!email || !password) { showAuthError('请输入邮箱和密码'); return; }
      if (password.length < 6) { showAuthError('密码至少 6 位'); return; }
      if (!isConfigured()) {
        showAuthError('Supabase 尚未配置，请在 assets/supabase.js 中填写 SUPABASE_URL 与 SUPABASE_KEY。');
        return;
      }
      authSubmit.disabled = true;
      authSubmit.textContent = mode === 'register' ? '注册中...' : '登录中...';
      try {
        if (mode === 'register') {
          await signUp(email, password);
          // 部分项目需邮箱验证；若无 session 提示用户
          if (!isLoggedIn()) {
            showAuthError('注册成功！若已开启邮箱验证，请前往邮箱点击确认链接后再登录。');
          } else {
            closeAuth();
          }
        } else {
          await signIn(email, password);
          closeAuth();
        }
      } catch (err) {
        showAuthError(err.message || String(err));
      } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = mode === 'register' ? '注册' : '登录';
      }
    });

    if ($('btn-logout')) $('btn-logout').addEventListener('click', function () {
      signOut().catch(function (e) { console.error(e); });
    });

    // 恢复登录会话并刷新 UI
    restoreSession();
  });
})();
