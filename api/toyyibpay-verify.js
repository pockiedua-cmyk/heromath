const crypto = require('crypto');

// ── Environment ──
const TOYYIBPAY_SECRET_KEY     = process.env.TOYYIBPAY_SECRET_KEY || '';
const TOYYIBPAY_BASE_URL       = (process.env.TOYYIBPAY_BASE_URL || 'https://toyyibpay.com').replace(/\/+$/, '');
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || '';
const FIREBASE_DATABASE_URL    = (process.env.FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');

// ── OAuth2 token cache ──
let _tokenCache = { token: null, expiresAt: 0 };

async function getOAuth2Token() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;
  let sa;
  try { sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT); } catch (e) { throw new Error('FIREBASE_SERVICE_ACCOUNT invalid JSON: ' + e.message); }
  const { client_email, private_key } = sa;
  if (!client_email || !private_key) throw new Error('Service Account missing client_email or private_key');

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const jwtClaim = Buffer.from(JSON.stringify({
    iss: client_email, scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now
  })).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(jwtHeader + '.' + jwtClaim), private_key);
  const jwt = jwtHeader + '.' + jwtClaim + '.' + signature.toString('base64url');

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString()
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('OAuth2 error: ' + JSON.stringify(data));
  _tokenCache = { token: data.access_token, expiresAt: now + (data.expires_in || 3600) - 60 };
  return data.access_token;
}

async function fbGet(path) {
  const token = await getOAuth2Token();
  const resp = await fetch(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token);
  return resp.json();
}

async function fbPut(path, value) {
  const token = await getOAuth2Token();
  await fetch(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

async function fbPatch(path, value) {
  const token = await getOAuth2Token();
  await fetch(FIREBASE_DATABASE_URL + '/' + path + '.json?access_token=' + token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

// ── ToyyibPay getBillTransactions ──
async function checkBillPaid(billCode) {
  const formData = new URLSearchParams();
  formData.append('userSecretKey', TOYYIBPAY_SECRET_KEY);
  formData.append('billCode', billCode);
  const resp = await fetch(TOYYIBPAY_BASE_URL + '/index.php/api/getBillTransactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
  const data = await resp.json();
  if (Array.isArray(data) && data.length > 0) {
    const bill = data[0];
    const status = parseInt(bill.billPaymentStatus) || 0;
    return { paid: status === 1, amount: bill.billAmount, refno: bill.billRefNo, paydate: bill.billPaymentDate, bill: bill };
  }
  return { paid: false, amount: undefined, refno: undefined, paydate: undefined, bill: undefined };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Support GET (browser) and POST
    let billCode, username, qty, orderId;
    if (req.method === 'GET') {
      billCode = req.query.billCode;
      username = (req.query.username || '').toUpperCase();
      qty = parseInt(req.query.qty) || 0;
    } else {
      billCode = req.body.billCode;
      username = (req.body.username || '').toUpperCase();
      qty = parseInt(req.body.qty) || 0;
    }

    // If we have orderId, read from Firebase
    if (!orderId && !username) {
      // Maybe they passed just billCode — try to find order in Firebase
      if (!billCode) return res.status(400).json({ success: false, error: 'billCode required' });
    }

    // Check bill with ToyyibPay
    const result = await checkBillPaid(billCode);
    if (result.paid) {
      if (!qty) qty = parseInt(result.amount) || 10;

      const currentCoin = await fbGet('tracking/' + username + '/shop/rare_coin');
      const newBalance = (currentCoin || 0) + qty;
      await fbPut('tracking/' + username + '/shop/rare_coin', newBalance);

      if (orderId) {
        await fbPatch('orders/' + orderId, {
          status: 'completed', paidAt: result.paydate || new Date().toISOString(),
          refno: result.refno || '', billcode: billCode,
          amount: parseInt(result.amount) || 0
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
      return res.status(200).json({ success: false, paid: false, message: 'Bill not paid yet' });
    }
  } catch (e) {
    console.error('verify error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
};
