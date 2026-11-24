import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'docs/product/schema.json'), 'utf8'));
const checking = process.argv.includes('--check');
const names = new Map(schema.tables.map(table => [table.name, table]));

function validateSchema() {
  if (names.size !== schema.tables.length) throw new Error('Duplicate table name.');
  for (const table of schema.tables) {
    const fields = new Set(table.columns.map(column => column.name));
    if (fields.size !== table.columns.length) throw new Error(`Duplicate field: ${table.name}`);
    if (!table.columns.some(column => column.keys.includes('PK'))) throw new Error(`Missing PK: ${table.name}`);
    for (const column of table.columns) {
      if (column.nullable && column.keys.includes('PK')) throw new Error(`Nullable PK: ${table.name}.${column.name}`);
      if (!column.references) continue;
      const [parent, field] = column.references.split('.');
      const target = names.get(parent)?.columns.find(candidate => candidate.name === field);
      if (!target || target.type !== column.type) throw new Error(`Invalid FK: ${table.name}.${column.name}`);
    }
  }
  for (const tables of Object.values(schema.diagrams)) {
    if (new Set(tables).size !== tables.length || tables.some(name => !names.has(name))) {
      throw new Error('Invalid diagram table selection.');
    }
  }
}

function emit(relative, content) {
  const target = path.join(root, relative);
  const normalized = content.trim() + '\n';
  if (checking) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== normalized) {
      throw new Error(`Generated file is stale: ${relative}; run npm run docs:generate.`);
    }
    return;
  }
  fs.writeFileSync(target, normalized);
}

function tableMarkdown(table) {
  const rows = table.columns.map(column => {
    const constraints = [...column.keys, column.references && `FK → ${column.references}`].filter(Boolean);
    return `| \`${column.name}\` | \`${column.type}\` | ${column.nullable ? 'Có' : 'Không'} | ${constraints.join('; ') || '—'} |`;
  });
  return [`### ${table.name}`, '', table.description, '', '| Cột | Kiểu | Nullable | Khóa |',
    '| --- | --- | --- | --- |', ...rows, '', ...table.rules.map(rule => `- ${rule}`), ''].join('\n');
}

function databaseMarkdown() {
  const intro = `# Database E-cards

Thiết kế PostgreSQL trên Aiven, **chưa có migration hoặc kiểm thử database thực tế**.
File này được sinh từ [schema.json](schema.json); sửa nguồn rồi chạy \`npm run docs:generate\`.

## Quy ước chung

- Tên bảng/cột dùng snake_case; id UUID do server cấp, ngoại trừ khóa danh mục/khóa ghép đã ghi rõ.
- Nullable=Không nghĩa là NOT NULL; PK tự bắt buộc NOT NULL. Các cột tiền, discriminator, version và counter không được NULL.
- Tiền dùng bigint đơn vị nhỏ nhất cùng currency ISO 4217; API gửi tiền dưới dạng chuỗi số nguyên. Không cộng khác currency.
- Timestamp dùng timestamptz, API dùng ISO 8601 UTC; ngày dự kiến dùng date và múi giờ IANA riêng.
- UNIQUE trên email/code có nghĩa unique index lower(value) khi quy tắc bảng ghi chuẩn hóa không phân biệt hoa thường.
- Các FK đơn dưới đây thể hiện tham chiếu; composite FK, CHECK, partial index và transaction tại [tính toàn vẹn](data-integrity.md) vẫn bắt buộc.
- Lịch sử order, payment, fulfillment, license, usage và ledger không cascade xóa theo tài khoản; dùng ẩn danh/retention. Chỉ bảng nối share/card được cascade có chủ đích.
- Giá/điều kiện đã publish hoặc checkout phải bất biến; nguồn nghiệp vụ không phải dữ liệu client hoặc cache Redis.

## Danh mục bảng

| Bảng | Nhóm | Trách nhiệm |
| --- | --- | --- |`;
  const index = schema.tables.map(table => `| [${table.name}](#${table.name}) | ${table.group} | ${table.description} |`).join('\n');
  const body = schema.tables.map(tableMarkdown).join('\n');
  return `${intro}\n${index}\n\n## Schema hợp nhất\n\n${body}\n## Tài liệu liên quan\n\n[Sơ đồ PNG](diagrams/README.md), [API](api.md), [quyền sử dụng](access-and-subscriptions.md), [giỏ hàng](cart-and-checkout.md), [analytics](analytics.md) và [kiểm chứng toàn vẹn](data-integrity.md).\n`;
}

function diagramColumns(table, overview) {
  const priority = ['id', 'card_id', 'order_item_id', 'user_id', 'role', 'free_template_id', 'template_id',
    'access_tier', 'template_license_id', 'entitlement_period_id', 'access_expires_at', 'source_order_item_id',
    'subtotal_minor', 'discount_minor', 'total_minor', 'application_level', 'starts_at', 'ends_at', 'max_distinct_templates'];
  const chosen = table.columns.filter(column => priority.includes(column.name));
  const others = table.columns.filter(column => !chosen.includes(column));
  return [...chosen, ...others].slice(0, overview ? 4 : 9);
}

function diagramMarkdown(name, selected) {
  const overview = name === 'overview';
  const blocks = selected.map(tableName => {
    const table = names.get(tableName);
    const columns = diagramColumns(table, overview).map(column => {
      const keys = [...column.keys, column.references && 'FK'].filter(Boolean).join(', ');
      return `        ${column.type.replace(/\W/g, '_')} ${column.name}${keys ? ' ' + keys : ''}`;
    });
    return `    ${tableName} {\n${columns.join('\n')}\n    }`;
  });
  const links = selected.flatMap(child => names.get(child).columns.filter(column => column.references).flatMap(column => {
    const parent = column.references.split('.')[0];
    if (!selected.includes(parent)) return [];
    const single = column.keys.includes('UK') || column.keys.includes('PK') && names.get(child).columns.filter(field => field.keys.includes('PK')).length === 1;
    return [`    ${parent} ${column.nullable ? 'o|' : '||'}--${single ? 'o|' : 'o{'} ${child} : ${column.name}`];
  }));
  return `# Sơ đồ ${name}\n\nNguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy \`npm run docs:generate\`.\n\n[Mở ảnh PNG](${name}.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.\n\n\`\`\`mermaid\nerDiagram\n${blocks.join('\n')}\n${links.join('\n')}\n\`\`\`\n\nPK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).\n`;
}

validateSchema();
emit('docs/product/database.md', databaseMarkdown());
for (const [name, selected] of Object.entries(schema.diagrams)) {
  emit(`docs/product/diagrams/${name}.md`, diagramMarkdown(name, selected));
}
emit('docs/product/diagrams/layouts.json', JSON.stringify(schema.diagrams, null, 2));
console.log(`${checking ? 'Verified' : 'Generated'} schema documentation: ${schema.tables.length} tables, ${Object.keys(schema.diagrams).length} diagrams.`);
