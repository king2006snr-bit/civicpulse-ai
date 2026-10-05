import { jsPDF } from "jspdf";
import type { MapInfrastructure } from "./map-data";
import type { ExtendedComplaint } from "./reports-store";

export interface GenerateReportOptions {
  infrastructure: MapInfrastructure[];
  complaints: ExtendedComplaint[];
  targetAsset?: MapInfrastructure | null;
  title?: string;
  categoryFilter?: string;
}

/**
 * Sanitizes text to printable standard ASCII for PDF compatibility.
 * Replaces unicode dashes, bullets, quotes, and symbols to prevent font encoding
 * corruption when rendered in Adobe Acrobat, Chrome, Edge, and mobile PDF readers.
 */
function cleanText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/[\u2014\u2015]/g, " -- ")
    .replace(/[\u2012\u2013]/g, " - ")
    .replace(/[\u00B7\u2022]/g, " | ")
    .replace(/\u00B0/g, " deg")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\r\n\t]/g, " ");
}

/**
 * Generates and triggers the download of an official PDF report containing
 * live, dynamically-extracted infrastructure and citizen complaint data.
 * Produces a strictly valid binary application/pdf Blob and triggers browser download.
 */
export function generateInfrastructureReportPdf(options: GenerateReportOptions): string {
  const { infrastructure, complaints, targetAsset, title, categoryFilter } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 14;
      drawHeader(true);
    }
  };

  const drawHeader = (isContinuation = false) => {
    // Header dark slate banner
    doc.setFillColor(15, 23, 42); // slate-900 #0f172a
    doc.rect(margin, y, contentWidth, isContinuation ? 11 : 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isContinuation ? 10 : 12.5);
    doc.text(
      isContinuation
        ? "CIVICPULSE AI -- MUNICIPAL REPORT (CONTINUED)"
        : "CIVICPULSE AI -- MUNICIPAL INFRASTRUCTURE & GRIEVANCE REPORT",
      margin + 4,
      y + (isContinuation ? 7.5 : 8.5),
    );

    if (!isContinuation) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300
      const nowStr = new Date().toLocaleString();
      const locationLabel = targetAsset
        ? cleanText(targetAsset.location)
        : "Vijayawada & Regional Municipal Zones";
      doc.text(cleanText(`Generated: ${nowStr} | Location: ${locationLabel}`), margin + 4, y + 15);
    }

    y += isContinuation ? 15 : 24;
  };

  // 1. Draw Title Header
  drawHeader();

  // 2. Report Overview & Metadata block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const reportSubject = targetAsset
    ? `Specific Asset Audit: ${cleanText(targetAsset.name)} (${cleanText(targetAsset.id)})`
    : cleanText(title || "Comprehensive Urban Infrastructure & Citizen Complaints Audit");
  doc.text(reportSubject, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const totalAssetsCount = infrastructure.length;
  const criticalCount = infrastructure.filter((i) => i.riskScore >= 80).length;
  const highRiskCount = infrastructure.filter((i) => i.riskScore >= 60 && i.riskScore < 80).length;
  const totalComplaintsCount = complaints.length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "In Progress" || c.status === "Assigned" || c.status === "In Review",
  ).length;
  const pendingCount = complaints.filter(
    (c) => c.status === "New" || c.status === "Pending",
  ).length;

  doc.text(
    cleanText(
      `Scope: ${targetAsset ? "Single Asset Focus" : categoryFilter ? `Filtered: ${categoryFilter}` : "All Monitored Assets"} | Assets Tracked: ${totalAssetsCount} | Critical: ${criticalCount} | High Risk: ${highRiskCount}`,
    ),
    margin + 4,
    y + 12,
  );
  doc.text(
    cleanText(
      `Citizen Grievance Triage: Total: ${totalComplaintsCount} | Pending: ${pendingCount} | In Progress: ${inProgressCount} | Resolved: ${resolvedCount}`,
    ),
    margin + 4,
    y + 18,
  );

  y += 28;

  // If specific target asset requested:
  if (targetAsset) {
    checkPageBreak(85);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 58, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("ASSET TELEMETRY & SPECIFICATIONS", margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const assetRows = [
      `Asset Name: ${cleanText(targetAsset.name)}`,
      `Asset Reference ID: ${cleanText(targetAsset.id)} (Category: ${cleanText(targetAsset.type)})`,
      `Location: ${cleanText(targetAsset.location)}`,
      `GPS Coordinates: ${targetAsset.latitude.toFixed(5)} deg N, ${targetAsset.longitude.toFixed(5)} deg E`,
      `Risk Score: ${targetAsset.riskScore}/100 | Priority Tier: ${cleanText(targetAsset.priority.toUpperCase())} | Status: ${cleanText(targetAsset.status || "Operational")}`,
      `Physical Condition: ${cleanText(targetAsset.condition)} | Traffic Density: ${cleanText(targetAsset.traffic)}`,
      `Structural Age: ${targetAsset.age} years | Past Failures: ${targetAsset.pastFailures} incidents`,
      `Last Inspection: ${cleanText(targetAsset.lastInspection)} | Logged Complaints: ${targetAsset.complaints}`,
    ];

    let rowY = y + 12;
    assetRows.forEach((row) => {
      doc.text(cleanText(row), margin + 4, rowY);
      rowY += 5.2;
    });

    y += 62;

    // AI Predictive Maintenance Recommendation
    checkPageBreak(26);
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text("AI PREDICTIVE MAINTENANCE & REMEDIATION PRESCRIPTION", margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    const recText =
      targetAsset.aiRecommendation ||
      "Continue routine sensor monitoring and preventative visual inspection.";
    const splitRec = doc.splitTextToSize(cleanText(recText), contentWidth - 8);
    doc.text(splitRec, margin + 4, y + 12);

    y += 28;

    // Associated Citizen Complaints
    const linkedComplaints = complaints.filter(
      (c) =>
        c.assetId === targetAsset.id ||
        c.assetId === targetAsset.assetId ||
        (c.location && c.location.toLowerCase().includes(targetAsset.name.toLowerCase())) ||
        (c.title && c.title.toLowerCase().includes(targetAsset.name.toLowerCase())),
    );

    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(`LINKED CITIZEN COMPLAINTS (${linkedComplaints.length})`), margin, y);
    y += 6;

    if (linkedComplaints.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No active citizen complaints logged for this asset.", margin, y + 4);
      y += 10;
    } else {
      linkedComplaints.forEach((c) => {
        checkPageBreak(32);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(cleanText(`[${c.id}] ${c.title}`), margin + 3, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const coordsStr =
          typeof c.latitude === "number" && typeof c.longitude === "number"
            ? ` (${c.latitude.toFixed(4)} deg N, ${c.longitude.toFixed(4)} deg E)`
            : "";
        doc.text(
          cleanText(
            `Category: ${c.category} | Status: ${c.status} | Priority: ${c.severity.toUpperCase()} | AI Confidence: ${c.aiConfidence}% | Date: ${c.reportedAt}`,
          ),
          margin + 3,
          y + 10,
        );

        doc.text(cleanText(`Location: ${c.location || c.ward}${coordsStr}`), margin + 3, y + 15);

        const desc = c.description || c.title;
        const splitDesc = doc.splitTextToSize(cleanText(`Description: ${desc}`), contentWidth - 6);
        doc.text(splitDesc.slice(0, 1), margin + 3, y + 20);

        if (c.update) {
          doc.text(cleanText(`Resolution Note: ${c.update}`), margin + 3, y + 24);
        }

        y += 29;
      });
    }
  } else {
    // 3. FULL REGISTER OF MONITORED INFRASTRUCTURE ASSETS
    checkPageBreak(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("MONITORED INFRASTRUCTURE ASSETS & RISK AUDIT", margin, y);
    y += 5;

    // Infrastructure table header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ID", margin + 2, y + 4.5);
    doc.text("Asset Name", margin + 18, y + 4.5);
    doc.text("Category", margin + 68, y + 4.5);
    doc.text("Risk", margin + 98, y + 4.5);
    doc.text("Priority", margin + 114, y + 4.5);
    doc.text("Condition", margin + 132, y + 4.5);
    doc.text("Complaints", margin + 158, y + 4.5);
    y += 7;

    infrastructure.forEach((item, index) => {
      checkPageBreak(7.5);
      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(margin, y, contentWidth, 7, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanText(item.id), margin + 2, y + 4.8);

      const nameStr = item.name.length > 30 ? `${item.name.slice(0, 28)}...` : item.name;
      doc.text(cleanText(nameStr), margin + 18, y + 4.8);
      doc.text(cleanText(item.type), margin + 68, y + 4.8);

      // Risk score highlight
      if (item.riskScore >= 80) {
        doc.setTextColor(220, 38, 38);
      } else if (item.riskScore >= 60) {
        doc.setTextColor(234, 88, 12);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      doc.text(`${item.riskScore}/100`, margin + 98, y + 4.8);

      doc.setTextColor(15, 23, 42);
      doc.text(cleanText(item.priority), margin + 114, y + 4.8);
      doc.text(cleanText(item.condition), margin + 132, y + 4.8);
      doc.text(String(item.complaints), margin + 162, y + 4.8);

      y += 7;
    });

    y += 8;

    // 4. CITIZEN COMPLAINTS REGISTER (DETAILED WITH DESCRIPTION, COORDS, PRIORITY, RESOLUTION)
    checkPageBreak(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(`CITIZEN COMPLAINTS & GRIEVANCE LOG (${complaints.length})`), margin, y);
    y += 6;

    complaints.forEach((c) => {
      checkPageBreak(28);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, "FD");

      // Title line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanText(`[${c.id}] ${c.title}`), margin + 3, y + 4.8);

      // Status Badge Color
      if (c.status === "Resolved") {
        doc.setTextColor(22, 163, 74);
      } else if (c.status === "In Progress" || c.status === "Assigned") {
        doc.setTextColor(147, 51, 234);
      } else if (c.status === "In Review") {
        doc.setTextColor(202, 138, 4);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(cleanText(`Status: ${c.status}`), margin + contentWidth - 32, y + 4.8);

      // Metadata line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const coordsStr =
        typeof c.latitude === "number" && typeof c.longitude === "number"
          ? ` (${c.latitude.toFixed(4)} deg N, ${c.longitude.toFixed(4)} deg E)`
          : "";
      doc.text(
        cleanText(
          `Category: ${c.category} | Priority: ${c.severity.toUpperCase()} | AI Confidence: ${c.aiConfidence}% | Reported: ${c.reportedAt}`,
        ),
        margin + 3,
        y + 9.5,
      );

      doc.text(cleanText(`Location: ${c.location || c.ward}${coordsStr}`), margin + 3, y + 14);

      // Description & Resolution note
      const desc = c.description || c.title;
      const splitDesc = doc.splitTextToSize(cleanText(`Description: ${desc}`), contentWidth - 6);
      doc.text(splitDesc.slice(0, 1), margin + 3, y + 18.5);

      if (c.update) {
        doc.text(cleanText(`Resolution Note: ${c.update}`), margin + 3, y + 22.5);
      }

      y += 26;
    });
  }

  // Final footer branding on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      cleanText(
        `CivicPulse AI Smart City Platform | Official Engineering Audit | Page ${i} of ${totalPages}`,
      ),
      margin,
      pageHeight - 8,
    );
    doc.text("CONFIDENTIAL MUNICIPAL RECORD", pageWidth - margin - 48, pageHeight - 8);
  }

  const dateSlug = new Date().toISOString().split("T")[0]!;
  const filePrefix = targetAsset
    ? `Infrastructure_Report_${targetAsset.id}_${dateSlug}`
    : `Infrastructure_Report_${dateSlug}`;
  const fileName = `${filePrefix}.pdf`;

  // Generate valid PDF binary data with proper application/pdf Blob
  const pdfArrayBuffer = doc.output("arraybuffer");
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = blobUrl;
    link.download = fileName;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }

  return fileName;
}
