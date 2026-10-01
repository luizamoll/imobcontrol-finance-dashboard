export type ReportCell = string | number | null | undefined;

export type ReportColumn = {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "right";
  kind?: "text" | "currency";
};

export type ReportExportData = {
  title: string;
  company?: string;
  filters?: string;
  generatedAt?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  summary?: string[];
  fileBaseName: string;
};

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function valueText(value: ReportCell, kind?: ReportColumn["kind"]) {
  if (value == null) return "";
  if (kind === "currency" && typeof value === "number") {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }
  return String(value);
}

// ---------- PDF ----------

const WIN_ANSI: Record<string, number> = {
  "€": 128,
  "‚": 130,
  "ƒ": 131,
  "„": 132,
  "…": 133,
  "†": 134,
  "‡": 135,
  "ˆ": 136,
  "‰": 137,
  "Š": 138,
  "‹": 139,
  "Œ": 140,
  "Ž": 142,
  "‘": 145,
  "’": 146,
  "“": 147,
  "”": 148,
  "•": 149,
  "–": 150,
  "—": 151,
  "˜": 152,
  "™": 153,
  "š": 154,
  "›": 155,
  "œ": 156,
  "ž": 158,
  "Ÿ": 159,
};

function winAnsi(value: string) {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 63;
    if (code <= 255) out += String.fromCharCode(code);
    else if (WIN_ANSI[char] != null) out += String.fromCharCode(WIN_ANSI[char]);
    else out += "?";
  }
  return out;
}

function pdfEscape(value: string) {
  return winAnsi(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function binaryBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pdfText(
  text: string,
  x: number,
  y: number,
  size: number,
  bold = false,
  align: "left" | "right" = "left",
) {
  const clean = text.replace(/\s+/g, " ").trim();
  const approximateWidth = clean.length * size * 0.48;
  const tx = align === "right" ? Math.max(0, x - approximateWidth) : x;
  return (
    "BT /" +
    (bold ? "F2" : "F1") +
    " " +
    size +
    " Tf 1 0 0 1 " +
    tx.toFixed(2) +
    " " +
    y.toFixed(2) +
    " Tm (" +
    pdfEscape(clean) +
    ") Tj ET\n"
  );
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, maxChars);
  return text.slice(0, Math.max(1, maxChars - 1)) + "…";
}

function pdfPageContent(
  data: ReportExportData,
  pageRows: Array<Record<string, ReportCell>>,
  pageIndex: number,
  totalPages: number,
) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 34;
  const usableWidth = pageWidth - margin * 2;
  const widthsRaw = data.columns.map((column) => column.width ?? 1);
  const widthTotal = widthsRaw.reduce((sum, width) => sum + width, 0);
  const widths = widthsRaw.map((width) => (width / widthTotal) * usableWidth);

  let content = "";
  content += "0.059 0.153 0.278 rg\n";
  content += "0 " + (pageHeight - 54) + " " + pageWidth + " 54 re f\n";
  content += "1 1 1 rg\n";
  content += pdfText("ImobControl", margin, pageHeight - 34, 17, true);
  content += pdfText(data.title, pageWidth - margin, pageHeight - 33, 12, true, "right");

  let y = pageHeight - 78;
  content += "0 0 0 rg\n";
  if (data.company) {
    content += pdfText("Empresa: " + data.company, margin, y, 9, true);
    y -= 14;
  }
  if (data.filters) {
    content += pdfText(data.filters, margin, y, 8);
    y -= 13;
  }
  if (data.generatedAt) {
    content += pdfText("Gerado em " + data.generatedAt, margin, y, 8);
    y -= 13;
  }
  if (data.summary?.length) {
    y -= 2;
    for (const line of data.summary.slice(0, 3)) {
      content += pdfText(line, margin, y, 9, true);
      y -= 13;
    }
  }

  y -= 7;
  const headerHeight = 22;
  content += "0.93 0.95 0.97 rg\n";
  content +=
    margin +
    " " +
    (y - headerHeight + 6).toFixed(2) +
    " " +
    usableWidth.toFixed(2) +
    " " +
    headerHeight +
    " re f\n";
  content += "0.12 0.16 0.2 rg\n";

  let x = margin;
  data.columns.forEach((column, index) => {
    const cellRight = x + widths[index];
    const maxChars = Math.max(5, Math.floor(widths[index] / 5.1));
    const label = truncateText(column.label, maxChars);
    content += pdfText(
      label,
      column.align === "right" ? cellRight - 5 : x + 5,
      y - 8,
      8,
      true,
      column.align === "right" ? "right" : "left",
    );
    x = cellRight;
  });

  y -= headerHeight;
  const rowHeight = 18;

  pageRows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      content += "0.975 0.98 0.985 rg\n";
      content +=
        margin +
        " " +
        (y - rowHeight + 5).toFixed(2) +
        " " +
        usableWidth.toFixed(2) +
        " " +
        rowHeight +
        " re f\n";
    }
    content += "0.14 0.16 0.18 rg\n";
    let cellX = margin;
    data.columns.forEach((column, index) => {
      const cellRight = cellX + widths[index];
      const text = valueText(row[column.key], column.kind);
      const maxChars = Math.max(4, Math.floor(widths[index] / 4.8));
      const shown = truncateText(text, maxChars);
      content += pdfText(
        shown,
        column.align === "right" ? cellRight - 5 : cellX + 5,
        y - 8,
        7.7,
        false,
        column.align === "right" ? "right" : "left",
      );
      cellX = cellRight;
    });
    y -= rowHeight;
  });

  content += "0.45 0.48 0.52 rg\n";
  content += pdfText(
    "Página " + (pageIndex + 1) + " de " + totalPages,
    pageWidth - margin,
    22,
    7.5,
    false,
    "right",
  );

  return content;
}

export function exportReportPdf(data: ReportExportData) {
  const rowsPerPage = data.summary?.length ? 22 : 25;
  const pages: Array<Array<Record<string, ReportCell>>> = [];
  if (data.rows.length === 0) pages.push([]);
  else {
    for (let i = 0; i < data.rows.length; i += rowsPerPage) {
      pages.push(data.rows.slice(i, i + rowsPerPage));
    }
  }

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  const kids: string[] = [];
  for (let i = 0; i < pages.length; i++) kids.push(String(5 + i * 2) + " 0 R");
  objects[2] = "<< /Type /Pages /Count " + pages.length + " /Kids [" + kids.join(" ") + "] >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pages.forEach((pageRows, index) => {
    const pageObj = 5 + index * 2;
    const streamObj = pageObj + 1;
    const stream = winAnsi(pdfPageContent(data, pageRows, index, pages.length));
    objects[pageObj] =
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " +
      streamObj +
      " 0 R >>";
    objects[streamObj] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += String(i) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + objects.length + "\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf +=
    "trailer\n<< /Size " +
    objects.length +
    " /Root 1 0 R >>\nstartxref\n" +
    xrefOffset +
    "\n%%EOF";

  downloadBytes(binaryBytes(pdf), safeFileName(data.fileBaseName) + ".pdf", "application/pdf");
}

// ---------- XLSX ----------

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(index: number) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function u32(value: number) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

function zipStore(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);

    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    centrals.push(central);
    offset += local.length;
  }

  const centralData = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralData.length),
    u32(offset),
    u16(0),
  ]);

  return concatBytes([...locals, centralData, end]);
}

function inlineStringCell(ref: string, text: string, style = 0) {
  return (
    '<c r="' +
    ref +
    '" t="inlineStr"' +
    (style ? ' s="' + style + '"' : "") +
    "><is><t>" +
    xmlEscape(text) +
    "</t></is></c>"
  );
}

function numberCell(ref: string, value: number, style = 0) {
  const finite = Number.isFinite(value) ? value : 0;
  return (
    '<c r="' +
    ref +
    '"' +
    (style ? ' s="' + style + '"' : "") +
    "><v>" +
    finite +
    "</v></c>"
  );
}

function buildSheetXml(data: ReportExportData) {
  const summary = data.summary ?? [];
  const headerRow = 4 + summary.length;
  const firstDataRow = headerRow + 1;
  const lastColumn = columnLetter(Math.max(0, data.columns.length - 1));
  const lastDataRow = Math.max(headerRow, firstDataRow + data.rows.length - 1);
  const filterText = [data.company ? "Empresa: " + data.company : "", data.filters ?? ""]
    .filter(Boolean)
    .join(" · ");

  const rows: string[] = [];
  rows.push('<row r="1" ht="24" customHeight="1">' + inlineStringCell("A1", data.title, 3) + "</row>");
  rows.push('<row r="2">' + inlineStringCell("A2", filterText, 4) + "</row>");
  rows.push(
    '<row r="3">' +
      inlineStringCell("A3", data.generatedAt ? "Gerado em " + data.generatedAt : "", 4) +
      "</row>",
  );

  summary.forEach((line, index) => {
    const row = 4 + index;
    rows.push('<row r="' + row + '">' + inlineStringCell("A" + row, line, 5) + "</row>");
  });

  const headerCells = data.columns
    .map((column, index) =>
      inlineStringCell(columnLetter(index) + headerRow, column.label, 1),
    )
    .join("");
  rows.push('<row r="' + headerRow + '" ht="22" customHeight="1">' + headerCells + "</row>");

  data.rows.forEach((row, rowIndex) => {
    const rowNumber = firstDataRow + rowIndex;
    const cells = data.columns
      .map((column, columnIndex) => {
        const ref = columnLetter(columnIndex) + rowNumber;
        const value = row[column.key];
        if (column.kind === "currency" && typeof value === "number") return numberCell(ref, value, 2);
        if (typeof value === "number") return numberCell(ref, value);
        return inlineStringCell(ref, valueText(value, column.kind));
      })
      .join("");
    rows.push('<row r="' + rowNumber + '">' + cells + "</row>");
  });

  const cols = data.columns
    .map((column, index) => {
      const width = Math.max(10, Math.min(45, (column.width ?? 1) * 12));
      return (
        '<col min="' +
        (index + 1) +
        '" max="' +
        (index + 1) +
        '" width="' +
        width +
        '" customWidth="1"/>'
      );
    })
    .join("");

  const mergeList = [
    '<mergeCell ref="A1:' + lastColumn + '1"/>',
    '<mergeCell ref="A2:' + lastColumn + '2"/>',
    '<mergeCell ref="A3:' + lastColumn + '3"/>',
  ];
  summary.forEach((_, index) => {
    const row = 4 + index;
    mergeList.push('<mergeCell ref="A' + row + ":" + lastColumn + row + '"/>');
  });

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    "<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"" +
    headerRow +
    "\" topLeftCell=\"A" +
    firstDataRow +
    "\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>" +
    "<cols>" +
    cols +
    "</cols><sheetData>" +
    rows.join("") +
    "</sheetData><mergeCells count=\"" +
    mergeList.length +
    "\">" +
    mergeList.join("") +
    "</mergeCells><autoFilter ref=\"A" +
    headerRow +
    ":" +
    lastColumn +
    lastDataRow +
    "\"/></worksheet>"
  );
}

export function exportReportExcel(data: ReportExportData) {
  const encoder = new TextEncoder();
  const files = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          "</Types>",
      ),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/workbook.xml",
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/styles.xml",
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<numFmts count="1"><numFmt numFmtId="164" formatCode="R$ #,##0.00"/></numFmts>' +
          '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>' +
          '<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>' +
          '<font><b/><sz val="16"/><color rgb="FF0F2747"/><name val="Calibri"/></font></fonts>' +
          '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
          '<fill><patternFill patternType="gray125"/></fill>' +
          '<fill><patternFill patternType="solid"><fgColor rgb="FF0F2747"/><bgColor indexed="64"/></patternFill></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="6">' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>' +
          '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf>' +
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
          "</cellXfs>" +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: encoder.encode(buildSheetXml(data)),
    },
  ];

  const bytes = zipStore(files);
  downloadBytes(
    bytes,
    safeFileName(data.fileBaseName) + ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
