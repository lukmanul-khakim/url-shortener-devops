'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory store: { [shortCode]: originalUrl }
// Untuk production, ganti dengan database (Redis, PostgreSQL, dll.)
const urlStore = new Map();

/**
 * POST /shorten
 * Terima URL panjang, kembalikan short code.
 *
 * Request body:
 *   { "url": "https://example.com/very/long/path?query=something" }
 *
 * Response (201):
 *   {
 *     "shortCode": "a1b2c3d4",
 *     "shortUrl": "http://localhost:3000/a1b2c3d4",
 *     "originalUrl": "https://example.com/very/long/path?query=something"
 *   }
 */
router.post('/shorten', (req, res) => {
  const { url } = req.body;

  // Validasi: url harus ada dan berupa string
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      error: 'Field "url" wajib diisi dan harus berupa string.',
    });
  }

  // Validasi format URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({
      error: 'URL tidak valid. Pastikan menyertakan protokol (http:// atau https://).',
    });
  }

  // Hanya izinkan http dan https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({
      error: 'Hanya URL dengan protokol http atau https yang diizinkan.',
    });
  }

  // Cek apakah URL ini sudah pernah di-shorten (hindari duplikat)
  for (const [code, storedUrl] of urlStore.entries()) {
    if (storedUrl === url) {
      const baseUrl = getBaseUrl(req);
      return res.status(200).json({
        shortCode: code,
        shortUrl: `${baseUrl}/${code}`,
        originalUrl: url,
      });
    }
  }

  // Generate short code unik (8 karakter hex)
  let shortCode;
  do {
    shortCode = crypto.randomBytes(4).toString('hex');
  } while (urlStore.has(shortCode));

  // Simpan ke store
  urlStore.set(shortCode, url);

  const baseUrl = getBaseUrl(req);

  return res.status(201).json({
    shortCode,
    shortUrl: `${baseUrl}/${shortCode}`,
    originalUrl: url,
  });
});

/**
 * GET /:code
 * Redirect ke URL asli berdasarkan short code.
 *
 * Response:
 *   302 Redirect → originalUrl
 *   404 jika code tidak ditemukan
 */
router.get('/:code', (req, res) => {
  const { code } = req.params;

  const originalUrl = urlStore.get(code);

  if (!originalUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short code "' + code + '" tidak ditemukan.'
    });
  }

  return res.redirect(302, originalUrl);
});

// --- Helper ---

function getBaseUrl(req) {
  // Ambil base URL dari request, atau dari env variable BASE_URL
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

module.exports = router;

