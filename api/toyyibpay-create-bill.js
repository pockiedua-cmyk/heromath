const https = require('https');
const http = require('http');
const { URL } = require('url');

const TOYYIBPAY_ENV_SECRET_KEY    = process.env.TOYYIBPAY_SECRET_KEY || '';
const TOYYIBPAY_ENV_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE || '';
const TOYYIBPAY_ENV_BASE_URL      = (process.env.TOYYIBPAY_BASE_URL || 'https://toyyibpay.com').replace(/\/+$/, '');

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(u, { method: 'POST', headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });

  try {
    let body = {};
    try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch(e) { body = {}; }

    const { orderId, billName, billDescription, billAmount, billTo, billEmail, billPhone } = body;
    if (!orderId || !billAmount) {
      return res.status(400).json({ success: false, error: 'Missing orderId or billAmount' });
    }

    // When client sends credentials in body, use those (they match the correct env).
    // Env vars only used as fallback when body has no credentials.
    const secretKey    = body.secretKey    || TOYYIBPAY_ENV_SECRET_KEY    || '';
    const categoryCode = body.categoryCode || TOYYIBPAY_ENV_CATEGORY_CODE || '';
    const baseUrl      = body.baseUrl      || TOYYIBPAY_ENV_BASE_URL      || 'https://toyyibpay.com';

    if (!secretKey || !categoryCode) {
      return res.status(500).json({ success: false, error: 'ToyyibPay credentials not configured. Set TOYYIBPAY_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE in Vercel env, or pass them in the request.' });
    }

    const origin = req.headers.origin || req.headers.referer || 'https://heromath.vercel.app';
    const returnUrl = origin.replace(/\/+$/, '') + '/?payment_return=1';

    const formData = new URLSearchParams();
    formData.append('userSecretKey', secretKey);
    formData.append('categoryCode', categoryCode);
    formData.append('billName', billName || 'Rare Coin');
    formData.append('billDescription', billDescription || 'Topup Rare Coin');
    formData.append('billPriceSetting', '1');
    formData.append('billPayorInfo', '1');
    formData.append('billAmount', String(billAmount));
    formData.append('billReturnUrl', returnUrl);
    formData.append('billCallbackUrl', '');
    formData.append('billExternalReferenceNo', orderId);
    formData.append('billTo', billTo || 'Player');
    formData.append('billEmail', billEmail || 'player@email.com');
    formData.append('billPhone', billPhone || '0123456789');
    formData.append('billSplitPayment', '0');
    formData.append('billPaymentChannel', '0');
    formData.append('billChargeToCustomer', '1');
    formData.append('billLanguage', 'en');

    const apiUrl = baseUrl + '/index.php/api/createBill';
    const result = await httpsPost(apiUrl, formData.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData.toString())
    });

    let data;
    try { data = JSON.parse(result.text); } catch(e) { data = result.text; }

    if (Array.isArray(data) && data[0] && data[0].BillCode) {
      const billCode = data[0].BillCode;
      return res.status(200).json({
        success: true,
        paymentUrl: baseUrl + '/' + billCode,
        billCode: billCode
      });
    } else {
      const rawErr = typeof data === 'string' ? data : JSON.stringify(data);
      const errMsg = rawErr.length > 300 ? rawErr.substring(0, 300) + '...' : rawErr;
      const isHtml = /<html|<doctype/i.test(errMsg);
      return res.status(500).json({
        success: false,
        error: isHtml ? 'ToyyibPay API returned an error page (check credentials or API URL)' : errMsg
      });
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
