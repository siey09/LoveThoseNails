import {
  formatIsoDate,
  getDayScheduleInfo,
  parseTimeSlotToMinutes,
} from './schedule';
import type {
  Appointment,
  BookedSlot,
  DayScheduleOverride,
  StudioScheduleConfig,
} from '../types/studio';

interface ExportBookedName {
  firstName: string;
}

interface ExportDayCell {
  day: number | null;
  iso: string | null;
  isToday: boolean;
  isClosed: boolean;
  isPastDate: boolean;
  bookedNames: ExportBookedName[];
  openCount: number;
}

export interface ExportCalendarImageParams {
  viewYear: number;
  viewMonth: number;
  todayIso: string;
  scheduleConfig: StudioScheduleConfig;
  dayOverrides: Record<string, DayScheduleOverride>;
  bookedSlots: BookedSlot[];
  activeAppointmentsByDate: Map<string, Appointment[]>;
}

const WEEKDAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function extractFirstName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Client';
  const parts = cleaned.split(' ');
  const first = parts[0];
  let chosen = first;
  if (/^(ma\.|ms\.|mr\.|mrs\.)$/i.test(first) && parts.length > 1) {
    chosen = `${first} ${parts[1]}`;
  }
  return chosen.charAt(0).toUpperCase() + chosen.slice(1);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (maxWidth <= 8) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

function triggerPngDownload(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const triggerFromUrl = (url: string, revoke: boolean) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) {
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
      resolve();
    };

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            triggerFromUrl(url, true);
          } else {
            try {
              const dataUrl = canvas.toDataURL('image/png');
              triggerFromUrl(dataUrl, false);
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Failed to export calendar PNG.'));
            }
          }
        },
        'image/png',
        1,
      );
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      triggerFromUrl(dataUrl, false);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to export calendar PNG.'));
    }
  });
}

export async function exportAdminCalendarImage({
  viewYear,
  viewMonth,
  todayIso,
  scheduleConfig,
  dayOverrides,
  bookedSlots,
  activeAppointmentsByDate,
}: ExportCalendarImageParams): Promise<{
  filename: string;
  bookedCount: number;
  openCount: number;
}> {
  if (document.fonts && 'ready' in document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed cleanly if font readiness rejects
    }
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthOnly = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
  });
  const yearOnly = String(viewYear);

  const cells: ExportDayCell[] = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    cells.push({
      day: null,
      iso: null,
      isToday: false,
      isClosed: false,
      isPastDate: false,
      bookedNames: [],
      openCount: 0,
    });
  }

  let totalBookedSlots = 0;
  let totalOpenSlots = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = formatIsoDate(viewYear, viewMonth, day);
    const info = getDayScheduleInfo(iso, scheduleConfig, dayOverrides, bookedSlots);

    const dayAppts = (activeAppointmentsByDate.get(iso) || [])
      .slice()
      .sort((a, b) => parseTimeSlotToMinutes(a.timeSlot) - parseTimeSlotToMinutes(b.timeSlot));

    const bookedNames: ExportBookedName[] = dayAppts.map((appt) => ({
      firstName: extractFirstName(appt.clientName),
    }));

    const apptTimeSet = new Set(dayAppts.map((a) => a.timeSlot));
    const extraActiveSlots = bookedSlots.filter(
      (b) => b.date === iso && b.status === 'active' && !apptTimeSet.has(b.timeSlot),
    );
    for (let i = 0; i < extraActiveSlots.length; i += 1) {
      bookedNames.push({ firstName: 'Reserved' });
    }

    totalBookedSlots += bookedNames.length;
    totalOpenSlots += info.openCount;

    cells.push({
      day,
      iso,
      isToday: iso === todayIso,
      isClosed: info.isClosed,
      isPastDate: info.isPastDate,
      bookedNames,
      openCount: info.openCount,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      day: null,
      iso: null,
      isToday: false,
      isClosed: false,
      isPastDate: false,
      bookedNames: [],
      openCount: 0,
    });
  }

  const weeks: ExportDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Editorial stationery canvas geometry
  const canvasWidth = 1680;
  const outerPad = 56;
  const innerPad = 48;
  const contentLeft = outerPad + innerPad;
  const contentWidth = canvasWidth - contentLeft * 2;

  const headerHeight = 158;
  const weekdayBarHeight = 40;
  const colGap = 12;
  const rowGap = 12;
  const footerHeight = 64;
  const cellPadX = 12;
  const cellTopArea = 44;
  const cellBottomPad = 12;
  const pillHeight = 29;
  const pillGap = 6;
  const minCellHeight = 140;

  const getCellVisualRowCount = (cell: ExportDayCell): number => {
    if (cell.day === null) return 0;
    const hasOpenOrFullBadge =
      cell.openCount > 0 || (cell.bookedNames.length > 0 && !cell.isClosed && !cell.isPastDate);
    return cell.bookedNames.length + (hasOpenOrFullBadge ? 1 : 0);
  };

  const weekHeights = weeks.map((week) => {
    const maxRows = week.reduce((max, cell) => Math.max(max, getCellVisualRowCount(cell)), 0);
    if (maxRows === 0) return minCellHeight;
    const contentHeight =
      cellTopArea + maxRows * pillHeight + Math.max(0, maxRows - 1) * pillGap + cellBottomPad;
    return Math.max(minCellHeight, contentHeight);
  });

  const colWidth = (contentWidth - colGap * 6) / 7;
  const gridBodyHeight =
    weekHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, weeks.length - 1) * rowGap;
  const sheetHeight =
    innerPad + headerHeight + weekdayBarHeight + 12 + gridBodyHeight + footerHeight;
  const canvasHeight = outerPad * 2 + sheetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  // Studio Porcelain Backdrop (#F2ECEB)
  ctx.fillStyle = '#F2ECEB';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Inner Editorial Paper Sheet (#FAF6F5) with subtle elevation & warm hairline border
  ctx.save();
  ctx.shadowColor = 'rgba(20, 18, 18, 0.05)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, outerPad, outerPad, canvasWidth - outerPad * 2, sheetHeight, 26);
  ctx.fillStyle = '#FAF6F5';
  ctx.fill();
  ctx.restore();

  drawRoundedRect(ctx, outerPad, outerPad, canvasWidth - outerPad * 2, sheetHeight, 26);
  ctx.strokeStyle = '#E2D6D4';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header Section (Clean Studio Editorial Typography)
  const headerTop = outerPad + innerPad;

  // Left: Brand Eyebrow + Serif Month Title
  ctx.fillStyle = '#8A5A5C';
  ctx.font = '600 12.5px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('LOVE THOSE NAILS  ·  BY ESHIN', contentLeft, headerTop);

  ctx.fillStyle = '#141212';
  ctx.font = '600 58px "Playfair Display", Georgia, serif';
  ctx.fillText(`${monthOnly} ${yearOnly}`, contentLeft, headerTop + 26);

  ctx.fillStyle = '#554C4B';
  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Studio Availability & Booked Client Schedule', contentLeft, headerTop + 98);

  // Right: Minimal Warm Monochrome Legend (no green, no bulky SaaS pills)
  const rightEdge = contentLeft + contentWidth;
  const legendTop = headerTop + 34;

  // Small legend block aligned right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#141212';
  ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${totalBookedSlots} Reserved   ·   ${totalOpenSlots} Open Slots`,
    rightEdge,
    legendTop,
  );

  // Sub-legend swatches (Dusty Rose = Reserved, Warm Cream = Open)
  const legendRowY = legendTop + 34;
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  const openLabel = 'Open Slots';
  const openLabelW = ctx.measureText(openLabel).width;
  const bookedLabel = 'Reserved (First Name)';
  const bookedLabelW = ctx.measureText(bookedLabel).width;

  // Draw Open Slots swatch + label from right
  ctx.fillStyle = '#554C4B';
  ctx.fillText(openLabel, rightEdge, legendRowY);
  const openSwatchX = rightEdge - openLabelW - 22;
  drawRoundedRect(ctx, openSwatchX, legendRowY + 1, 14, 14, 4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#CFC2C0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Draw Reserved swatch + label to the left
  const bookedTextRight = openSwatchX - 24;
  ctx.fillStyle = '#554C4B';
  ctx.fillText(bookedLabel, bookedTextRight, legendRowY);
  const bookedSwatchX = bookedTextRight - bookedLabelW - 22;
  drawRoundedRect(ctx, bookedSwatchX, legendRowY + 1, 14, 14, 4);
  ctx.fillStyle = '#EFE3E3';
  ctx.fill();
  ctx.strokeStyle = '#D2AAAB';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';

  // Thin editorial divider beneath header
  const dividerY = headerTop + 134;
  ctx.strokeStyle = '#E6DCDA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentLeft, dividerY);
  ctx.lineTo(rightEdge, dividerY);
  ctx.stroke();

  // Weekday Header Row
  const weekdayY = headerTop + headerHeight;
  for (let col = 0; col < 7; col += 1) {
    const x = contentLeft + col * (colWidth + colGap);
    ctx.fillStyle = col === 0 || col === 6 ? '#8A5A5C' : '#554C4B';
    ctx.font = '600 12.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(WEEKDAY_HEADERS[col], x + colWidth / 2, weekdayY + weekdayBarHeight / 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Calendar Week Rows
  let currentY = weekdayY + weekdayBarHeight + 12;

  for (let wIdx = 0; wIdx < weeks.length; wIdx += 1) {
    const week = weeks[wIdx];
    const rowHeight = weekHeights[wIdx];

    for (let col = 0; col < 7; col += 1) {
      const cell = week[col];
      const cellX = contentLeft + col * (colWidth + colGap);

      if (cell.day === null) {
        drawRoundedRect(ctx, cellX, currentY, colWidth, rowHeight, 14);
        ctx.fillStyle = '#F2ECEA';
        ctx.fill();
        continue;
      }

      const hasBookings = cell.bookedNames.length > 0;
      const isInactiveMuted = (cell.isClosed || cell.isPastDate) && !hasBookings;

      drawRoundedRect(ctx, cellX, currentY, colWidth, rowHeight, 14);
      ctx.fillStyle = isInactiveMuted ? '#EFE8E7' : '#FFFFFF';
      ctx.fill();

      ctx.strokeStyle = cell.isToday
        ? '#8A5A5C'
        : hasBookings
          ? '#D6B6B7'
          : isInactiveMuted
            ? '#E5DCDA'
            : '#E4D8D6';
      ctx.lineWidth = cell.isToday ? 2 : 1.1;
      ctx.stroke();

      // Day number
      ctx.fillStyle = isInactiveMuted ? '#8D8180' : '#141212';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(String(cell.day), cellX + cellPadX, currentY + 12);

      if (cell.isToday) {
        const badgeW = 50;
        const badgeX = cellX + colWidth - cellPadX - badgeW;
        drawRoundedRect(ctx, badgeX, currentY + 13, badgeW, 19, 6);
        ctx.fillStyle = '#141212';
        ctx.fill();
        ctx.fillStyle = '#FAF6F5';
        ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TODAY', badgeX + badgeW / 2, currentY + 23);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      } else if (hasBookings && !cell.isClosed && !cell.isPastDate && cell.openCount > 0) {
        ctx.fillStyle = '#8A5A5C';
        ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          `${cell.bookedNames.length} booked`,
          cellX + colWidth - cellPadX,
          currentY + 16,
        );
        ctx.textAlign = 'left';
      }

      const pillW = colWidth - cellPadX * 2;
      let itemY = currentY + cellTopArea;

      // Closed / Past / No Slots (when no bookings)
      if (cell.bookedNames.length === 0 && cell.openCount === 0) {
        const statusLabel = cell.isClosed
          ? 'CLOSED'
          : cell.isPastDate
            ? '—'
            : 'NO SLOTS';
        ctx.fillStyle = cell.isClosed ? '#9A7476' : '#968A88';
        ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(statusLabel, cellX + colWidth / 2, currentY + rowHeight / 2 + 8);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        continue;
      }

      // Booked client First Name pills (warm dusty rosewood)
      for (const booked of cell.bookedNames) {
        drawRoundedRect(ctx, cellX + cellPadX, itemY, pillW, pillHeight, 8);
        ctx.fillStyle = '#EFE3E3';
        ctx.fill();
        ctx.strokeStyle = '#D7B7B8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Minimal rosewood accent dot
        ctx.beginPath();
        ctx.arc(cellX + cellPadX + 12, itemY + pillHeight / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#8A5A5C';
        ctx.fill();

        const nameX = cellX + cellPadX + 22;
        const maxNameW = pillW - 30;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#141212';
        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        const displayName = fitTextWithEllipsis(ctx, booked.firstName, maxNameW);
        ctx.fillText(displayName, nameX, itemY + pillHeight / 2 + 0.5);
        ctx.textBaseline = 'top';

        itemY += pillHeight + pillGap;
      }

      // Remaining open slots pill — warm alabaster & taupe-espresso typography (ZERO green!)
      if (cell.openCount > 0) {
        const openText = `${cell.openCount} ${cell.openCount === 1 ? 'slot' : 'slots'} open`;
        drawRoundedRect(ctx, cellX + cellPadX, itemY, pillW, pillHeight, 8);
        ctx.fillStyle = '#F7F2F1';
        ctx.fill();
        ctx.strokeStyle = '#DDD1CF';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#4B4241';
        ctx.font = '500 12.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(openText, cellX + colWidth / 2, itemY + pillHeight / 2 + 0.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      } else if (cell.bookedNames.length > 0 && !cell.isClosed && !cell.isPastDate) {
        drawRoundedRect(ctx, cellX + cellPadX, itemY, pillW, pillHeight, 8);
        ctx.fillStyle = '#F3EAE9';
        ctx.fill();
        ctx.strokeStyle = '#DFD1CF';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#7D6A69';
        ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Fully Booked', cellX + colWidth / 2, itemY + pillHeight / 2 + 0.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }
    }

    currentY += rowHeight + rowGap;
  }

  // Clean Editorial Footer
  const footerY = currentY + 18;
  const exportedStamp = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  ctx.fillStyle = '#554C4B';
  ctx.font = '500 13.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Love Those Nails by Eshin  ·  Message or reserve open slots online',
    contentLeft,
    footerY,
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7C706F';
  ctx.font = '500 12.5px "JetBrains Mono", monospace';
  ctx.fillText(`Updated ${exportedStamp}`, rightEdge, footerY + 1);
  ctx.textAlign = 'left';

  const filename = `love-those-nails-${viewYear}-${String(viewMonth + 1).padStart(2, '0')}.png`;
  await triggerPngDownload(canvas, filename);

  return {
    filename,
    bookedCount: totalBookedSlots,
    openCount: totalOpenSlots,
  };
}
