const https = require('https');
const { URL } = require('url');

// ── Environment ──
const TOYYIBPAY_SECRET_KEY    = process.env.TOYYIBPAY_SECRET_KEY || '';
const TOYYIBPAY_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE || '';
const TOYYIBPAY_BASE_URL      = (process.env.TOYYIBPAY_BASE_URL || 'https://toyyibpay.com').replace(/\/+$/, '');
const GAME_URL                = (process.env.GAME_URL || '').replace(/\/+$/, '');
const PAYMENT_URL             = (process.env.PAYMENT_URL || '').replace(/\/+$/, '');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });

  try {
    // Vercel @vercel/node mungkin tak auto-parse JSON body
    let body = {};
    try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch(e) { body = {}; }

    const { orderId, billName, billDescription, billAmount, billTo, billEmail, billPhone } = body;

    if (!orderId || !billAmount) {
      console.error('Missing fields, body:', JSON.stringify(body));
      return res.status(400).json({ success: false, error: 'Missing orderId or billAmount' });
    }

    const origin = req.headers.origin || req.headers.referer || GAME_URL || 'https://heromath.vercel.app';
    const returnUrl = origin.replace(/\/+$/, '') + '/?payment_return=1';
    const callbackUrl = '';

    const formData = new URLSearchParams();
    formData.append('userSecretKey', TOYYIBPAY_SECRET_KEY);
    formData.append('categoryCode', TOYYIBPAY_CATEGORY_CODE);
    formData.append('billName', billName || 'Rare Coin');
    formData.append('billDescription', billDescription || 'Topup Rare Coin');
    formData.append('billPriceSetting', '1');
    formData.append('billPayorInfo', '1');
    formData.append('billAmount', String(billAmount));
    formData.append('billReturnUrl', returnUrl);
    formData.append('billCallbackUrl', callbackUrl);
    formData.append('billExternalReferenceNo', orderId);
    formData.append('billTo', billTo || 'Player');
    formData.append('billEmail', billEmail || 'player@email.com');
    formData.append('billPhone', billPhone || '0123456789');
    formData.append('billSplitPayment', '0');
    formData.append('billPaymentChannel', '0');
    formData.append('billContentEmail', 'Thank you for your purchase! Your Rare Coin will be credited automatically.');
    formData.append('billChargeToCustomer', '1');
    formData.append('billLanguage', 'en');

    const apiUrl = new URL('/index.php/api/createBill', TOYYIBPAY_BASE_URL);
    const result = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const data = await result.json();

    if (Array.isArray(data) && data[0] && data[0].BillCode) {
      const billCode = data[0].BillCode;
      console.log('Bill created:', billCode, 'for order:', orderId);
      return res.status(200).json({
        success: true,
        paymentUrl: TOYYIBPAY_BASE_URL + '/' + billCode,
        billCode: billCode
      });
    } else {
      console.error('ToyyibPay error:', JSON.stringify(data));
      return res.status(500).json({ success: false, error: JSON.stringify(data) });
    }
  } catch (e) {
    console.error('create-bill error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
};
