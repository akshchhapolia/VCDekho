/**
 * Convert Reddit post markdown into safe HTML for Investor Buzz cards.
 * Handles paragraphs, markdown tables, basic inline formatting, and lists.
 */

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeBody(raw) {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function parseTableRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function parseAlignments(separatorCells) {
  return separatorCells.map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

function inlineMarkdown(text) {
  let out = escHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__(.+?)__/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/_(.+?)_/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const href = /^https?:\/\//i.test(url) ? escHtml(url) : '#';
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return out;
}

function renderParagraph(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  return `<p class="buzz-body-p">${lines.map(inlineMarkdown).join('<br>')}</p>`;
}

function renderTable(tableLines) {
  const rows = tableLines.map(parseTableRow).filter(Boolean);
  if (rows.length < 2) {
    return tableLines.map((line) => renderParagraph(line)).join('');
  }

  let header = rows[0];
  let bodyRows = rows.slice(1);
  let alignments = header.map(() => 'left');

  if (bodyRows.length && isSeparatorRow(bodyRows[0])) {
    alignments = parseAlignments(bodyRows[0]);
    bodyRows = bodyRows.slice(1);
  }

  const colCount = header.length;
  const normalizeRow = (cells) => {
    const copy = cells.slice(0, colCount);
    while (copy.length < colCount) copy.push('');
    return copy;
  };

  header = normalizeRow(header);
  bodyRows = bodyRows.map(normalizeRow);

  const thead = `<thead><tr>${header
    .map(
      (cell, i) =>
        `<th class="buzz-table-align-${alignments[i] || 'left'}">${inlineMarkdown(cell)}</th>`
    )
    .join('')}</tr></thead>`;

  const tbody = bodyRows.length
    ? `<tbody>${bodyRows
        .map(
          (cells) =>
            `<tr>${cells
              .map(
                (cell, i) =>
                  `<td class="buzz-table-align-${alignments[i] || 'left'}">${inlineMarkdown(cell)}</td>`
              )
              .join('')}</tr>`
        )
        .join('')}</tbody>`
    : '';

  return `<div class="buzz-table-wrap"><table class="buzz-table">${thead}${tbody}</table></div>`;
}

function segmentBody(text) {
  const lines = text.split('\n');
  const segments = [];
  let paraLines = [];

  function flushPara() {
    if (!paraLines.length) return;
    segments.push({ type: 'para', text: paraLines.join('\n') });
    paraLines = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|.+\|\s*$/.test(line)) {
      flushPara();
      const tableLines = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      segments.push({ type: 'table', lines: tableLines });
    } else if (!line.trim()) {
      flushPara();
      i += 1;
    } else if (/^[-*]\s+/.test(line.trim())) {
      flushPara();
      const listLines = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listLines.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      segments.push({ type: 'ul', items: listLines });
    } else {
      paraLines.push(line);
      i += 1;
    }
  }
  flushPara();
  return segments;
}

function renderList(items) {
  if (!items.length) return '';
  return `<ul class="buzz-body-list">${items
    .map((item) => `<li>${inlineMarkdown(item)}</li>`)
    .join('')}</ul>`;
}

/**
 * @param {string} raw Reddit selftext / body_excerpt
 * @returns {string} safe HTML fragment
 */
function renderBuzzBodyHtml(raw) {
  const text = normalizeBody(raw);
  if (!text) return '';

  const segments = segmentBody(text);
  return segments
    .map((seg) => {
      if (seg.type === 'table') return renderTable(seg.lines);
      if (seg.type === 'ul') return renderList(seg.items);
      return renderParagraph(seg.text);
    })
    .join('');
}

function buzzBodyPlainLength(raw) {
  return normalizeBody(raw).length;
}

function buzzBodyIsLong(raw) {
  const text = normalizeBody(raw);
  if (!text) return false;
  return text.length > 520 || text.split('\n').length > 8 || /^\s*\|.+\|\s*$/m.test(text);
}

module.exports = {
  renderBuzzBodyHtml,
  buzzBodyPlainLength,
  buzzBodyIsLong,
  escHtml,
  inlineMarkdown
};
