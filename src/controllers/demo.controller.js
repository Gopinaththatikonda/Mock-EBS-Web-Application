'use strict';

const { datasets, summary, notices } = require('../data/demo-data');

// Every response is flagged demo:true so the UI can label it as illustrative data.
function demoResponse(payload) {
  return { success: true, demo: true, source: 'demo-data', ...payload };
}

function getSummary(req, res) {
  res.json(demoResponse({ summary, notices }));
}

// GET /api/demo/:dataset?page=1&pageSize=10&q=search
function listDataset(req, res) {
  const rows = datasets[req.params.dataset];
  if (!rows) {
    return res.status(404).json({ success: false, message: 'The requested resource was not found.' });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 50) : '';
  const filtered = q
    ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
    : rows;

  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 50);
  const pages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);

  res.json(
    demoResponse({
      page,
      pageSize,
      total: filtered.length,
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
    })
  );
}

// GET /api/demo/track/:serviceNo
function trackService(req, res) {
  const serviceNo = String(req.params.serviceNo || '').trim().toUpperCase();
  const svc = datasets.serviceOperations.find((s) => s.serviceNo === serviceNo);
  if (!svc) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `No service found with number ${serviceNo}. Please check the service number and try again.`,
    });
  }

  const reached = { Scheduled: 0, 'On Time': 1, Departed: 1, Delayed: 1, Arrived: 3 }[svc.status] ?? 0;
  const stops = [
    { stop: svc.from, time: svc.departure, label: 'Departure' },
    { stop: svc.via, time: '-', label: 'Via' },
    { stop: svc.to, time: svc.arrival, label: 'Arrival' },
  ].map((s, i) => ({ ...s, done: i < reached }));

  res.json(demoResponse({ service: svc, stops }));
}

module.exports = { getSummary, listDataset, trackService };
