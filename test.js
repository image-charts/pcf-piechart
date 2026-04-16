/**
 * Unit Tests for PieChartGenerator PCF Component
 */

const crypto = require('crypto');

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function normalizeColors(colors) {
  if (!colors) return '';
  return colors.split('|').map(c => {
    const trimmed = c.trim();
    const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return /^[0-9A-Fa-f]{6}$/.test(withoutHash) ? withoutHash.toUpperCase() : '';
  }).filter(c => c !== '').join('|');
}

function parseDataValues(data) {
  if (!data) return [];
  const trimmed = data.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

function formatDataAwesome(values) {
  if (values.length === 0) return '';
  return 'a:' + values.join(',');
}

function parseLabels(labels) {
  if (!labels) return [];
  const trimmed = labels.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(l => l.trim()).filter(l => l !== '');
}

function buildPieChartUrl(params) {
  const { accountId, secretKey, privateCloudDomain, data, labels, colors, title, chartSize } = params;
  const host = privateCloudDomain || 'image-charts.com';
  const dataValues = parseDataValues(data);

  const queryParts = ['cht=p', 'chs=' + (chartSize || '400x300'), 'chd=' + formatDataAwesome(dataValues)];

  if (labels) {
    const labelArr = parseLabels(labels);
    if (labelArr.length > 0) queryParts.push('chl=' + labelArr.join('|'));
  }
  if (colors) {
    const normalizedColors = normalizeColors(colors);
    if (normalizedColors) queryParts.push('chco=' + normalizedColors);
  }
  if (title) queryParts.push('chtt=' + title);
  if (accountId && !privateCloudDomain) queryParts.push('icac=' + accountId);

  const queryString = queryParts.join('&');

  if (accountId && secretKey && !privateCloudDomain) {
    const signature = computeHmacSha256Sync(secretKey, queryString);
    return 'https://' + host + '/chart?' + queryString + '&ichm=' + signature;
  }
  return 'https://' + host + '/chart?' + queryString;
}

describe('Pie Chart URL Building', () => {
  test('should build pie chart URL with cht=p', () => {
    const url = buildPieChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '30,40,30',
      labels: 'Red,Green,Blue'
    });

    expect(url).toContain('cht=p');
    expect(url).toContain('chd=a:30,40,30');
    expect(url).toContain('chl=Red|Green|Blue');
    expect(url).toContain('ichm=');
  });

  test('should include colors', () => {
    const url = buildPieChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '30,40,30',
      colors: 'FF0000|00FF00|0000FF'
    });

    expect(url).toContain('chco=FF0000|00FF00|0000FF');
  });

  test('should handle Private Cloud mode', () => {
    const url = buildPieChartUrl({
      privateCloudDomain: 'charts.mycompany.com',
      data: '30,40,30'
    });

    expect(url).toContain('https://charts.mycompany.com/chart');
    expect(url).not.toContain('ichm=');
  });
});

describe('Data Values', () => {
  test('should calculate correct percentages', () => {
    const values = parseDataValues('25,25,50');
    expect(values).toEqual([25, 25, 50]);
    const total = values.reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  test('should handle decimal values', () => {
    const values = parseDataValues('33.33,33.33,33.34');
    expect(values[0]).toBeCloseTo(33.33);
    expect(values[1]).toBeCloseTo(33.33);
    expect(values[2]).toBeCloseTo(33.34);
  });
});
