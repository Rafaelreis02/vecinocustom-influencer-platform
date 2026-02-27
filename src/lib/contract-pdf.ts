import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ContractData {
  influencerName: string;
  influencerHandle: string;
  agreedPrice: number;
  commissionRate: number;
  productDescription?: string;
  date: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function generateContractPDF(data: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 size
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 60;
  const contentWidth = pageWidth - 2 * margin;
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  
  // Helper to check if we need a new page
  const checkNewPage = (neededSpace: number = 100) => {
    if (y < neededSpace + margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };
  
  // Helper to add centered text
  const addCenteredText = (text: string, size: number, bold = false, yOffset = 0) => {
    const currentFont = bold ? fontBold : font;
    const textWidth = currentFont.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, {
      x,
      y: y + yOffset,
      size,
      font: currentFont,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper to add left-aligned text with wrapping
  const addWrappedText = (text: string, size: number, bold = false, indent = 0) => {
    const currentFont = bold ? fontBold : font;
    const words = text.split(' ');
    let line = '';
    const lineHeight = size * 1.4;
    const maxLineWidth = contentWidth - indent;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const lineWidth = currentFont.widthOfTextAtSize(testLine, size);
      
      if (lineWidth > maxLineWidth && line) {
        page.drawText(line, {
          x: margin + indent,
          y,
          size,
          font: currentFont,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
        checkNewPage();
        line = word;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: currentFont,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  };
  
  // Helper to add section title
  const addSectionTitle = (title: string) => {
    checkNewPage(80);
    y -= 10;
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: pageWidth - margin, y: y + 5 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 15;
    addWrappedText(title, 12, true);
    y -= 5;
  };
  
  // Helper to add bullet point
  const addBulletPoint = (text: string, indent = 15) => {
    checkNewPage();
    page.drawText('•', {
      x: margin + indent,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    addWrappedText(text, 10, false, indent + 15);
    y -= 3;
  };
  
  // === HEADER ===
  addCenteredText('VECINO CUSTOM', 22, true);
  y -= 25;
  addCenteredText('COLLABORATION AGREEMENT', 16, true);
  y -= 8;
  addCenteredText('Between the Brand and Content Creator', 11);
  y -= 30;
  
  // Decorative line
  page.drawLine({
    start: { x: margin + 50, y },
    end: { x: pageWidth - margin - 50, y },
    thickness: 2,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 30;
  
  // === PARTIES ===
  addWrappedText('Between the parties:', 10);
  y -= 8;
  
  addWrappedText('1. VECINO CUSTOM', 10, true);
  addWrappedText('   A registered brand owned by BRILLOSCURO LDA, with registered office at Rua Comendador Sá Couto 112, 4520-192 Santa Maria da Feira, Portugal, Tax ID: 517924773 (hereinafter referred to as the "Brand" or "First Party")', 9, false, 10);
  y -= 8;
  
  addWrappedText(`2. ${data.influencerName}`, 10, true);
  addWrappedText(`   Content Creator with social media handle @${data.influencerHandle} (hereinafter referred to as the "Creator" or "Second Party")`, 9, false, 10);
  y -= 15;
  
  addWrappedText('Enter into the present Collaboration Agreement, governed by the following clauses:', 10);
  y -= 20;
  
  // === CLAUSE 1 ===
  addSectionTitle('1. Purpose of the Collaboration');
  addWrappedText(`The purpose of this partnership is the creation of original digital content by the Creator, with the aim of promoting the products of VECINO CUSTOM, namely ${data.productDescription || 'personalized jewelry pieces'}.`, 10);
  
  // === CLAUSE 2 ===
  addSectionTitle('2. Collaboration Terms');
  
  addWrappedText('Obligations of the Brand (First Party):', 10, true);
  addBulletPoint('Free delivery of 1 personalized jewelry piece, selected based on the Creator\'s personal style and preferences');
  addBulletPoint(`Assignment of an exclusive discount code providing: (i) 10% discount for the Creator's community; (ii) ${data.commissionRate}% commission on each sale made using the code`);
  
  // Only show fixed remuneration if agreedPrice > 0
  if (data.agreedPrice > 0) {
    addBulletPoint(`Payment of a fixed remuneration of ${data.agreedPrice.toFixed(2)}€ upon completion of deliverables`);
  }
  y -= 8;
  
  addWrappedText('Obligations of the Creator (Second Party):', 10, true);
  addBulletPoint('Create and publish one creative video and one photograph on social media platforms (TikTok, Instagram Reels, Instagram Stories)');
  addBulletPoint('Content must have emotional and aesthetic focus, aligned with the brand\'s identity');
  addBulletPoint('Content must be completed and published within 5 days after receiving the product');
  addBulletPoint('Submit content for brand approval prior to publication');
  
  // === CLAUSE 3 ===
  addSectionTitle('3. Ownership and Usage Rights');
  addBulletPoint('Content remains the intellectual property of the Creator');
  addBulletPoint('The Brand has full usage rights and may share content on digital platforms (Instagram, TikTok, Website, Email Marketing) with proper credit');
  addBulletPoint('The Brand is authorized to use content in paid advertising campaigns without further authorization');
  addBulletPoint('Creator agrees to provide necessary access for content promotion');
  
  // === CLAUSE 4 ===
  addSectionTitle('4. Remuneration and Commissions');
  
  if (data.agreedPrice > 0) {
    addBulletPoint(`Fixed remuneration: ${data.agreedPrice.toFixed(2)}€ (paid after content delivery and approval)`);
    addBulletPoint(`Commission: ${data.commissionRate}% on each sale using the exclusive discount code`);
  } else {
    addBulletPoint('This is a commission-only partnership with no fixed remuneration.');
    addBulletPoint(`Commission: ${data.commissionRate}% on each sale using the exclusive discount code`);
  }
  addBulletPoint('Commission payments made monthly by the 10th day of each month');
  addBulletPoint('Payment requires: (i) Content delivery; (ii) Access codes for sponsorship; (iii) Valid receipt/invoice from Creator');
  addBulletPoint('Payment via bank transfer to IBAN provided by Creator');
  
  // === CLAUSE 5 ===
  addSectionTitle('5. Confidentiality and Dispute Resolution');
  addBulletPoint('Both parties maintain confidentiality of all information exchanged');
  addBulletPoint('Conflicts shall first be resolved amicably between parties');
  addBulletPoint('Any dispute governed by Portuguese law, with courts of Santa Maria da Feira as competent authority');
  
  // === CLAUSE 6 ===
  addSectionTitle('6. Duration and Termination');
  addBulletPoint('Agreement enters force upon acceptance by both parties');
  addBulletPoint('Indefinite duration, terminable with 5 business days notice');
  addBulletPoint('No retroactive effect on termination regarding content usage');
  
  // === CLAUSE 7 ===
  addSectionTitle('7. Final Considerations');
  addBulletPoint('Both parties agree to maintain clear, cordial, and professional communication');
  addBulletPoint('Amendments must be in writing and agreed by both parties');
  addBulletPoint('By accepting, both parties declare full agreement with all terms');
  addBulletPoint('If Creator is a minor, legal representative must sign and assume responsibility');
  
  // === DIGITAL ACCEPTANCE ===
  checkNewPage(200);
  y -= 30;
  
  // Box for digital signature
  page.drawRectangle({
    x: margin - 10,
    y: y - 10,
    width: contentWidth + 20,
    height: 140,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.97),
  });
  
  y -= 25;
  addCenteredText('DIGITAL ACCEPTANCE', 13, true, 0);
  y -= 20;
  
  addWrappedText(`This contract was digitally accepted by ${data.influencerName} (@${data.influencerHandle})`, 9);
  addWrappedText(`Date: ${data.date}`, 9);
  
  if (data.ipAddress) {
    addWrappedText(`IP Address: ${data.ipAddress}`, 9);
  }
  
  y -= 10;
  addWrappedText('This digital acceptance constitutes a valid electronic signature under Portuguese and EU law (eIDAS Regulation).', 8);
  
  // === FOOTER ===
  checkNewPage(60);
  y -= 40;
  
  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: pageWidth - margin, y: y + 20 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  
  y -= 15;
  addCenteredText(`Santa Maria da Feira, ${data.date}`, 10);
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
