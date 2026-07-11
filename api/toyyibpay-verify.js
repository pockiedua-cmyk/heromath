const crypto = require('crypto');
const https = require('https');
const http = require('http');
const URL = require('url').URL;

const TOYYIBPAY_SECRET_KEY     = process.env.TOYYIBPAY_SECRET_KEY || '';
const TOYYIBPAY_BASE_URL       = (process.env.TOYYIBPAY_BASE_URL || 'https://toyyibpay.com').replace(/\/+$/, '');
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';
const FIREBASE_DATABASE_URL    = (process.env.FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');

function httpReq(url, opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const method = (opts && opts.method) || 'GET';
    const headers = (opts && opts.headers) || {};
    const req = mod.request(u, { method, headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, json, text: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts && opts.body) req.write(opts.body);
    req.end();
  });
}

let _tokenCache = { token: null, expiresAt: 0 };

async function getOAuth2Token() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;
  let sa;
  try { sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT); } catch (e) { throw new Error('FIREBASE_SERVICE_ACCOUNT invalid: ' + e.message); }
  const { client_email, private_key } = sa;
  if (!client_email || !private_key) throw new Error('Service Account missing fields');

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const jwtClaim = Buffer.from(JSON.stringify({
    iss: client_email, scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now
  })).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(jwtHeader + '.' + jwtClaim), private_key);
  const jwt = jwtHeader + '.' + jwtClaim + '.' + signature.toString('base64url');

  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString();
  const resp = await httpReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  const data = resp.json || {};
  if (!data.access_token) throw new Error('OAuth2 error: ' + JSON.stringify(data));
  _tokenCache = { token: data.access_token, expiresAt: now + (data.expires_in || 3600) - 60 };
  return data.access_token;
}

async function fbGet(path) {
  const token = await getOAuth2Token();
  const resp = await httpReq(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token);
  return resp.json;
}

async function fbPut(path, value) {
  const token = await getOAuth2Token();
  const body = JSON.stringify(value);
  await httpReq(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body
  });
}

async function fbPatch(path, value) {
  const token = await getOAuth2Token();
  const body = JSON.stringify(value);
  await httpReq(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body
  });
}

async function checkBillPaid(billCode) {
  const formData = new URLSearchParams();
  formData.append('userSecretKey', TOYYIBPAY_SECRET_KEY);
  formData.append('billCode', billCode);
  const body = formData.toString();
  const resp = await httpReq(TOYYIBPAY_BASE_URL + '/index.php/api/getBillTransactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  const data = resp.json;
  if (Array.isArray(data) && data.length > 0) {
    const bill = data[0];
    const status = parseInt(bill.billPaymentStatus) || 0;
    return { paid: status === 1, amount: bill.billAmount, refno: bill.billRefNo, paydate: bill.billPaymentDate, bill };
  }
  return { paid: false };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let billCode, username, qty, orderId;
    if (req.method === 'GET') {
      billCode = req.query.billCode;
      username = (req.query.username || '').toUpperCase();
      qty = parseInt(req.query.qty) || 0;
    } else {
      let body = {};
      try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch(e) { body = {}; }
      billCode = body.billCode || '';
      username = (body.username || '').toUpperCase();
      qty = parseInt(body.qty) || 0;
      orderId = body.orderId || '';
    }

    if (orderId && (!username || !billCode)) {
      try {
        const order = await fbGet('orders/' + orderId);
        if (order) {
          if (!username) username = (order.username || '').toUpperCase();
          if (!billCode) billCode = order.billCode || '';
          if (!qty) qty = parseInt(order.qty) || 0;
        }
      } catch(e) { console.error('Order read failed:', e.message); }
    }

    if (!billCode) return res.status(400).json({ success: false, error: 'billCode required' });
    if (!username) return res.status(400).json({ success: false, error: 'username required' });

    const result = await checkBillPaid(billCode);
    if (result.paid) {
      if (!qty && result.amount) {
        const cents = parseInt(result.amount) || 0;
        const pkgMap = { 200: 10, 500: 30, 800: 50, 1500: 100, 6500: 500 };
        qty = pkgMap[cents] || Math.round(cents / 50) || 10;
      }
      if (!qty) qty = 10;

      const currentCoin = await fbGet('tracking/' + username + '/shop/rare_coin');
      const newBalance = (currentCoin || 0) + qty;
      await fbPut('tracking/' + username + '/shop/rare_coin', newBalance);

      if (orderId) {
        await fbPatch('orders/' + orderId, {
          status: 'completed', paidAt: result.paydate || new Date().toISOString(),
          refno: result.refno || '', billcode: billCode, amount: parseInt(result.amount) || 0
        });
      } else {
        const directOrderId = 'DIRECT_' + Date.now();
        await fbPut('orders/' + directOrderId, {
          username, billCode, qty, status: 'completed',
          paidAt: new Date().toISOString(), refno: result.refno || '',
          amount: parseInt(result.amount) || 0, createdAt: Date.now()
        });
      }
      return res.status(200).json({ success: true, qty, username });
    } else {
      return res.status(200).json({ success: false, paid: false, message: 'Not paid yet' });
    }
  } catch (e) {
    console.error('verify error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
};
