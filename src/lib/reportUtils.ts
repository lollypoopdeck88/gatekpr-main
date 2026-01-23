import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './exportUtils';

interface FinancialReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  hoaName?: string;
  dateRange?: string;
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  summary?: { label: string; value: string; color?: string }[];
  tableHeaders?: string[];
  tableData?: string[][];
}

export function generateFinancialPDF(data: FinancialReportData): void {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(74, 85, 104); // Primary color
  doc.text(data.title, 20, yPosition);
  yPosition += 8;

  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(data.subtitle, 20, yPosition);
    yPosition += 6;
  }

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${formatDate(data.generatedAt.toISOString())}`, 20, yPosition);
  yPosition += 5;

  if (data.hoaName) {
    doc.text(`Community: ${data.hoaName}`, 20, yPosition);
    yPosition += 5;
  }

  if (data.dateRange) {
    doc.text(`Period: ${data.dateRange}`, 20, yPosition);
    yPosition += 5;
  }

  yPosition += 10;

  // Sections
  for (const section of data.sections) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Section title
    doc.setFontSize(14);
    doc.setTextColor(74, 85, 104);
    doc.text(section.title, 20, yPosition);
    yPosition += 8;

    // Summary cards (if any)
    if (section.summary && section.summary.length > 0) {
      const cardWidth = (170 - (section.summary.length - 1) * 5) / section.summary.length;
      section.summary.forEach((item, index) => {
        const x = 20 + index * (cardWidth + 5);
        
        // Card background
        doc.setFillColor(247, 250, 252);
        doc.roundedRect(x, yPosition, cardWidth, 20, 2, 2, 'F');
        
        // Label
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(item.label, x + 5, yPosition + 8);
        
        // Value
        doc.setFontSize(12);
        if (item.color === 'green') {
          doc.setTextColor(72, 187, 120);
        } else if (item.color === 'red') {
          doc.setTextColor(245, 101, 101);
        } else if (item.color === 'yellow') {
          doc.setTextColor(236, 201, 75);
        } else {
          doc.setTextColor(45, 55, 72);
        }
        doc.text(item.value, x + 5, yPosition + 16);
      });
      yPosition += 28;
    }

    // Simple table rendering (without autotable dependency)
    if (section.tableHeaders && section.tableData && section.tableData.length > 0) {
      const colWidth = 170 / section.tableHeaders.length;
      const startX = 20;
      
      // Table header
      doc.setFillColor(74, 85, 104);
      doc.rect(startX, yPosition, 170, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      section.tableHeaders.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + 2, yPosition + 5.5);
      });
      yPosition += 8;
      
      // Table rows
      doc.setTextColor(45, 55, 72);
      section.tableData.slice(0, 15).forEach((row, rowIndex) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Alternating row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(247, 250, 252);
          doc.rect(startX, yPosition, 170, 7, 'F');
        }
        
        row.forEach((cell, i) => {
          const cellText = String(cell).substring(0, 25); // Truncate long text
          doc.text(cellText, startX + i * colWidth + 2, yPosition + 5);
        });
        yPosition += 7;
      });
      
      if (section.tableData.length > 15) {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`... and ${section.tableData.length - 15} more rows (see Excel export for full data)`, startX, yPosition + 5);
        yPosition += 10;
      }
      
      yPosition += 10;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | GateKpr Financial Report`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${formatDate(data.generatedAt.toISOString()).replace(/[,\s]/g, '_')}.pdf`;
  doc.save(filename);
}

export function generateFinancialExcel(
  data: {
    sheetName: string;
    headers: string[];
    rows: (string | number)[][];
  }[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  for (const sheet of data) {
    const worksheetData = [sheet.headers, ...sheet.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = sheet.headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...sheet.rows.map(row => String(row[i] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Calendar integration utilities
export function generateGoogleCalendarUrl(event: {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}): string {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateAppleCalendarFile(event: {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}): void {
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z';
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@gatekpr`;
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GateKpr//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
