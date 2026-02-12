/**
 * AMPRISE PANELS - Professional Quotation PDF Template
 * Complete with company details, GST, MSME, Bank Details, Terms & Conditions
 */

const PDFDocument = require('pdfkit');
const numberToWords = require('../utils/numberToWords');

/**
 * Generate Professional Quotation PDF
 */
function generateQuotationPDF(quotation, items, res) {
    const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        bufferPages: true
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AMPRISE-QUOTATION-${quotation.quotation_number}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // =================== COMPANY HEADER ===================
    // Company Logo Placeholder
    doc.fontSize(20).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('AMPRISE PANELS', 50, 50, { align: 'center' });
    
    doc.fontSize(9).font('Helvetica')
       .fillColor('#333333')
       .text('PRIVATE LIMITED', 50, 70, { align: 'center' });
    
    // Company Tagline
    doc.fontSize(8).font('Helvetica-Oblique')
       .fillColor('#666666')
       .text('ISO 9001:2015 CERTIFIED • MSME REGISTERED', 50, 90, { align: 'center' });
    
    // Company Address
    doc.fontSize(8).font('Helvetica')
       .fillColor('#333333')
       .text('H-10, LIGHT INDUSTRIAL AREA, BHILAI, CHHATTISGARH - 490026', 50, 110, { align: 'center' })
       .text('Email: amprisepanels@gmail.com | Mobile: +91 8085524096 | GST: 22ABCCA6801D1ZD', 50, 125, { align: 'center' });
    
    // Horizontal Line
    doc.moveTo(50, 145).lineTo(550, 145).lineWidth(1).strokeColor('#1a237e').stroke();
    
    // =================== QUOTATION TITLE ===================
    doc.fontSize(16).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('QUOTATION', 50, 160, { align: 'center' });
    
    // Quotation Number and Date
    const createdDate = quotation.created_at ? new Date(quotation.created_at) : new Date();
    const formattedDate = createdDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    
    doc.fontSize(9).font('Helvetica')
       .fillColor('#333333');
    
    // Quotation Ref (Left)
    doc.text(`Ref: ${quotation.quotation_number || 'N/A'}`, 50, 185);
    doc.text(`Date: ${formattedDate}`, 50, 200);
    
    // Valid Until (Right)
    const validUntil = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const formattedValidUntil = validUntil.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    
    doc.text(`Valid Until: ${formattedValidUntil}`, 400, 185, { align: 'right' });
    doc.text(`GST: 18% Extra`, 400, 200, { align: 'right' });
    
    // =================== CUSTOMER DETAILS ===================
    doc.moveTo(50, 230).lineTo(550, 230).lineWidth(0.5).strokeColor('#cccccc').stroke();
    
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('To,', 50, 245);
    
    doc.fontSize(10).font('Helvetica')
       .fillColor('#333333');
    
    let y = 260;
    doc.text(quotation.customer_name || 'N/A', 50, y);
    y += 15;
    
    if (quotation.customer_address) {
        const addressLines = quotation.customer_address.split('\n');
        addressLines.forEach(line => {
            doc.text(line, 50, y);
            y += 15;
        });
    }
    
    if (quotation.customer_phone) {
        doc.text(`Phone: ${quotation.customer_phone}`, 50, y);
        y += 15;
    }
    
    if (quotation.customer_email) {
        doc.text(`Email: ${quotation.customer_email}`, 50, y);
        y += 15;
    }
    
    if (quotation.gstNumber) {
        doc.text(`GSTIN: ${quotation.gstNumber}`, 50, y);
        y += 15;
    }
    
    y += 10;
    
    // =================== PANEL SPECIFICATIONS ===================
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('Panel Specifications', 50, y);
    y += 20;
    
    // Create specifications table
    const specStartY = y;
    
    // Left column
    doc.fontSize(9).font('Helvetica-Bold')
       .fillColor('#333333')
       .text('Panel Type:', 50, specStartY);
    doc.font('Helvetica')
       .text(quotation.panel_type_name || quotation.panelType || 'N/A', 150, specStartY);
    
    doc.font('Helvetica-Bold')
       .text('Panel Name:', 50, specStartY + 15);
    doc.font('Helvetica')
       .text(quotation.panel_name || quotation.panelName || 'N/A', 150, specStartY + 15);
    
    doc.font('Helvetica-Bold')
       .text('Panel Size:', 50, specStartY + 30);
    doc.font('Helvetica')
       .text(quotation.panel_size || quotation.panelSize || 'N/A', 150, specStartY + 30);
    
    doc.font('Helvetica-Bold')
       .text('IP Rating:', 50, specStartY + 45);
    doc.font('Helvetica')
       .text(quotation.ip_rating || quotation.ipRating || 'IP55', 150, specStartY + 45);
    
    // Right column
    doc.font('Helvetica-Bold')
       .text('Feeders:', 300, specStartY);
    doc.font('Helvetica')
       .text(quotation.number_of_feeders?.toString() || quotation.feederCount?.toString() || '0', 380, specStartY);
    
    doc.font('Helvetica-Bold')
       .text('Motors:', 300, specStartY + 15);
    doc.font('Helvetica')
       .text(quotation.motor_count?.toString() || quotation.motorCount?.toString() || '0', 380, specStartY + 15);
    
    doc.font('Helvetica-Bold')
       .text('Busbar:', 300, specStartY + 30);
    doc.font('Helvetica')
       .text(quotation.busbar_type || quotation.busbarType || 'Copper', 380, specStartY + 30);
    
    doc.font('Helvetica-Bold')
       .text('Brand:', 300, specStartY + 45);
    doc.font('Helvetica')
       .text(quotation.brand_preference || quotation.brandPreference || 'Standard', 380, specStartY + 45);
    
    y = specStartY + 75;
    
    // Special Requirements
    if (quotation.specialRequirements || quotation.special_requirements) {
        doc.font('Helvetica-Bold')
           .text('Special Requirements:', 50, y);
        y += 15;
        doc.font('Helvetica')
           .text(quotation.specialRequirements || quotation.special_requirements, 50, y, { width: 500 });
        y += 30;
    } else {
        y += 20;
    }
    
    // =================== BILL OF MATERIALS ===================
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('Bill of Materials (BOM)', 50, y);
    y += 20;
    
    // Group items by category
    const incomerItems = items.filter(item => 
        item.category === 'Circuit Breaker' || 
        item.category === 'Busbar' ||
        item.category === 'Controller' ||
        item.category === 'Capacitor' ||
        item.category === 'Meter' ||
        item.category === 'Instrument'
    );
    
    const outgoingItems = items.filter(item => 
        item.category === 'Contactor' || 
        item.category === 'Protection' ||
        item.category === 'Relay' ||
        item.category === 'PLC' ||
        item.category === 'VFD'
    );
    
    const otherItems = items.filter(item => 
        item.category === 'Enclosure' ||
        item.category === 'Accessory' ||
        item.category === 'Wiring'
    );
    
    // Function to draw BOM table
    const drawBOMTable = (title, tableItems, startY) => {
        if (tableItems.length === 0) return startY;
        
        doc.fontSize(10).font('Helvetica-Bold')
           .fillColor('#283593')
           .text(title, 50, startY);
        
        let yPos = startY + 20;
        
        // Table Header
        doc.fontSize(8).font('Helvetica-Bold')
           .fillColor('#ffffff');
        
        // Draw header background
        doc.rect(50, yPos - 5, 500, 20)
           .fillColor('#283593')
           .fill();
        
        doc.fillColor('#ffffff');
        doc.text('Sr.', 55, yPos);
        doc.text('Component Name', 95, yPos);
        doc.text('Specifications', 250, yPos);
        doc.text('Brand', 400, yPos);
        doc.text('Qty', 470, yPos, { width: 40, align: 'right' });
        
        yPos += 20;
        
        // Table Rows
        doc.font('Helvetica').fontSize(8).fillColor('#333333');
        
        let srNo = 1;
        tableItems.forEach((item, index) => {
            // Alternate row colors
            if (index % 2 === 0) {
                doc.rect(50, yPos - 5, 500, 18)
                   .fillColor('#f8f9fa')
                   .fill();
            }
            
            doc.fillColor('#333333');
            doc.text(srNo.toString(), 55, yPos);
            doc.text(item.name?.substring(0, 35) || '', 95, yPos, { width: 150 });
            doc.text(item.specifications?.substring(0, 30) || 'Standard', 250, yPos, { width: 145 });
            doc.text(item.brand || 'Standard', 400, yPos, { width: 65 });
            doc.text(item.quantity?.toString() || '1', 470, yPos, { width: 40, align: 'right' });
            
            yPos += 18;
            srNo++;
            
            // Add new page if needed
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }
        });
        
        yPos += 10;
        return yPos;
    };
    
    // Draw BOM tables
    y = drawBOMTable('INCOMER SECTION', incomerItems, y) + 10;
    y = drawBOMTable('OUTGOING SECTION', outgoingItems, y) + 10;
    y = drawBOMTable('OTHER COMPONENTS', otherItems, y) + 10;
    
    // =================== PRICE BID ===================
    // Check if we need a new page
    if (y > 650) {
        doc.addPage();
        y = 50;
    }
    
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('Price Bid', 50, y);
    y += 20;
    
    // Calculate totals
    let totalMaterialCost = 0;
    items.forEach(item => {
        totalMaterialCost += (item.quantity || 0) * (item.unit_price || 0);
    });
    
    const productionCost = totalMaterialCost * 1.43; // 43% production costs
    const profitMargin = quotation.profit_margin || quotation.profitMargin || 20;
    const gstPercentage = quotation.gst_percentage || quotation.gstPercentage || 18;
    const priceBeforeGST = productionCost * (1 + profitMargin/100);
    const gstAmount = priceBeforeGST * (gstPercentage/100);
    const finalAmount = quotation.final_amount || quotation.costBreakdown?.finalAmount || priceBeforeGST + gstAmount;
    
    // Price Table
    doc.fontSize(9);
    
    // Table Header
    doc.rect(50, y - 5, 500, 20)
       .fillColor('#283593')
       .fill();
    
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text('Sr.', 55, y)
       .text('Description', 95, y)
       .text('Qty', 400, y, { width: 40, align: 'right' })
       .text('Rate (₹)', 440, y, { width: 60, align: 'right' })
       .text('Amount (₹)', 500, y, { width: 50, align: 'right' });
    
    y += 20;
    doc.fillColor('#333333');
    
    // Main Panel
    doc.font('Helvetica-Bold')
       .rect(50, y - 5, 500, 20)
       .fillColor('#e8eaf6')
       .fill();
    
    doc.fillColor('#1a237e')
       .text('1', 55, y)
       .text(`${quotation.panel_type_name || quotation.panelType} Panel with Enclosure, Complete Wiring`, 95, y, { width: 300 })
       .text('1', 400, y, { width: 40, align: 'right' })
       .text(totalMaterialCost.toLocaleString('en-IN'), 440, y, { width: 60, align: 'right' })
       .text(totalMaterialCost.toLocaleString('en-IN'), 500, y, { width: 50, align: 'right' });
    
    y += 20;
    
    // Switchgear
    doc.font('Helvetica')
       .rect(50, y - 5, 500, 20)
       .fillColor('#ffffff')
       .fill();
    
    doc.fillColor('#333333')
       .text('2', 55, y)
       .text('Switchgear & Metering Items (as per BOM)', 95, y, { width: 300 })
       .text('', 400, y)
       .text('', 440, y)
       .text('Inclusive', 500, y, { width: 50, align: 'right' });
    
    y += 20;
    
    // Production Charges
    doc.rect(50, y - 5, 500, 20)
       .fillColor('#f8f9fa')
       .fill();
    
    doc.fillColor('#333333')
       .text('3', 55, y)
       .text('Production, Wiring, Fabrication & Testing Charges', 95, y, { width: 300 })
       .text('1', 400, y, { width: 40, align: 'right' })
       .text((productionCost - totalMaterialCost).toLocaleString('en-IN'), 440, y, { width: 60, align: 'right' })
       .text((productionCost - totalMaterialCost).toLocaleString('en-IN'), 500, y, { width: 50, align: 'right' });
    
    y += 20;
    
    // Sub Total
    doc.font('Helvetica-Bold')
       .rect(50, y - 5, 500, 20)
       .fillColor('#e0e0e0')
       .fill();
    
    doc.fillColor('#000000')
       .text('', 55, y)
       .text('SUB TOTAL', 95, y)
       .text('', 400, y)
       .text('', 440, y)
       .text(productionCost.toLocaleString('en-IN'), 500, y, { width: 50, align: 'right' });
    
    y += 20;
    
    // GST
    doc.rect(50, y - 5, 500, 20)
       .fillColor('#f5f5f5')
       .fill();
    
    doc.font('Helvetica')
       .text('', 55, y)
       .text(`GST @ ${gstPercentage}%`, 95, y)
       .text('', 400, y)
       .text('', 440, y)
       .text(gstAmount.toLocaleString('en-IN'), 500, y, { width: 50, align: 'right' });
    
    y += 20;
    
    // GRAND TOTAL
    doc.font('Helvetica-Bold')
       .rect(50, y - 5, 500, 25)
       .fillColor('#d4edda')
       .fill();
    
    doc.fillColor('#155724')
       .fontSize(10)
       .text('', 55, y)
       .text('GRAND TOTAL', 95, y)
       .text('', 400, y)
       .text('', 440, y)
       .text(finalAmount.toLocaleString('en-IN'), 500, y, { width: 50, align: 'right' });
    
    y += 30;
    
    // Amount in Words
    doc.fontSize(9).font('Helvetica-Bold')
       .fillColor('#155724')
       .text(`Amount in Words: ${numberToWords(finalAmount)} only.`, 50, y, { width: 500 });
    
    y += 30;
    
    // =================== BANK DETAILS ===================
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('Payment Details', 50, y);
    y += 20;
    
    doc.fontSize(8).font('Helvetica');
    
    const bankDetails = [
        ['Bank Name', 'YES BANK, DURG BHILAI, CHHATTISGARH'],
        ['Account No.', '006761900002241'],
        ['IFSC Code', 'YESB0000067'],
        ['Account Holder', 'AMPRISE PANELS PRIVATE LIMITED']
    ];
    
    bankDetails.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}:`, 50, y);
        doc.font('Helvetica').text(value, 150, y);
        y += 15;
    });
    
    y += 10;
    
    // =================== TERMS & CONDITIONS ===================
    // Check if we need a new page
    if (y > 650) {
        doc.addPage();
        y = 50;
    }
    
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('Terms & Conditions', 50, y);
    y += 20;
    
    const terms = [
        '1. Delivery: 4-5 weeks from the date of receipt of advance payment and approved drawing.',
        '2. Payment Terms: 50% advance with order, balance 50% before dispatch.',
        '3. Taxes: GST @ 18% extra as applicable. GST invoice will be provided.',
        '4. Validity: This quotation is valid for 30 days from the date mentioned above.',
        '5. Warranty: 12 months from the date of dispatch against manufacturing defects.',
        '6. Packing: Wooden crate packing extra at actuals.',
        '7. Freight: Transportation charges extra at actuals or buyer can arrange own transport.',
        '8. Insurance: Transit insurance to be arranged by buyer.',
        '9. Inspection: Pre-dispatch inspection at our works can be arranged.',
        '10. Installation: Erection & commissioning charges extra if required.',
        '11. Force Majeure: Seller not liable for delays due to unforeseen circumstances.',
        '12. Jurisdiction: All disputes subject to Durg (Chhattisgarh) jurisdiction only.'
    ];
    
    doc.fontSize(8).font('Helvetica')
       .fillColor('#333333');
    
    terms.forEach(term => {
        if (y > 750) {
            doc.addPage();
            y = 50;
        }
        doc.text(term, 60, y, { width: 490 });
        y += 15;
    });
    
    y += 20;
    
    // =================== SIGNATURE ===================
    doc.fontSize(9).font('Helvetica-Bold')
       .fillColor('#1a237e')
       .text('For AMPRISE PANELS PRIVATE LIMITED', 350, y, { align: 'center' });
    
    doc.moveTo(350, y + 30).lineTo(500, y + 30).lineWidth(1).strokeColor('#000000').stroke();
    
    doc.fontSize(8).font('Helvetica')
       .fillColor('#333333')
       .text('Authorized Signatory', 350, y + 35, { align: 'center' });
    
    // Footer
    doc.fontSize(7).font('Helvetica')
       .fillColor('#666666')
       .text('This is a computer generated quotation - valid with signature and stamp.', 50, 780, { align: 'center', width: 500 })
       .text('Thank you for your business!', 50, 795, { align: 'center', width: 500 });
    
    // Finalize PDF
    doc.end();
}

module.exports = generateQuotationPDF;