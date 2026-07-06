/**
 * Vercel Serverless Function — AI API 代理
 * 路径: /api/analyze
 *
 * 功能：
 * 1. 隐藏 API Key（密钥存在服务器环境变量中，前端看不到）
 * 2. 速率限制（防止恶意刷接口）
 * 3. 支持 CORS（跨域请求）
 * 4. 支持论文分析、问答、翻译等多种请求类型
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// 简易内存速率限制（生产环境建议用 Redis）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
const RATE_LIMIT_MAX = 10; // 每个 IP 每分钟最多 10 次请求

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }

  record.count++;
  rateLimitMap.set(ip, record);

  // 定期清理过期记录
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  return record.count <= RATE_LIMIT_MAX;
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

module.exports = async (req, res) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*');
    Object.entries(getCorsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取客户端 IP（用于速率限制）
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

  // 速率限制
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      message: 'Rate limit exceeded. Max 10 requests per minute.'
    });
  }

  // 从环境变量获取 API Key（前端无法看到）
  const API_KEY = process.env.DEEPSEEK_API_KEY;
  const API_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!API_KEY) {
    return res.status(500).json({
      error: '服务器未配置 API Key',
      message: 'DEEPSEEK_API_KEY environment variable is not set.'
    });
  }

  try {
    const body = req.body || (typeof req.body === 'string' ? JSON.parse(req.body) : {});
    const { messages, type, temperature, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少 messages 参数' });
    }

    // 限制输入长度，防止滥用
    const totalLength = messages.reduce((sum, m) => sum + (m.content || '').length, 0);
    if (totalLength > 15000) {
      return res.status(400).json({
        error: '输入内容过长，请缩短后重试',
        message: 'Input too long. Max 15000 characters.'
      });
    }

    // 根据请求类型设置参数
    let model = API_MODEL;
    let temp = temperature !== undefined ? temperature : 0.7;
    let maxTokens = max_tokens || 4000;

    // 论文分析需要较大输出（含章节、图表、游戏等完整 JSON）
    if (type === 'analyze') {
      maxTokens = 8000;
      temp = 0.7;
    } else if (type === 'qa') {
      maxTokens = 1500;
      temp = 0.5;
    } else if (type === 'recommend') {
      maxTokens = 1000;
      temp = 0.5;
    } else if (type === 'compare') {
      maxTokens = 1000;
      temp = 0.3;
    }

    // 调用 DeepSeek API
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temp,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('DeepSeek API error:', response.status, errData);
      return res.status(response.status).json({
        error: 'AI 接口调用失败',
        message: errData.error ? errData.error.message : `API error ${response.status}`,
      });
    }

    const data = await response.json();

    // 返回结果（CORS 头已设置）
    Object.entries(getCorsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      error: '服务器内部错误',
      message: err.message,
    });
  }
};
