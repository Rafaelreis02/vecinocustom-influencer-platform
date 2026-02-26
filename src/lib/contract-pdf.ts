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
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  const margin = 50;
  const maxWidth = width - 2 * margin;
  
  // Helper to add text
  const addText = (text: string, size: number, bold = false, lineHeight = 1.2) => {
    const currentFont = bold ? fontBold : font;
    const words = text.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const lineWidth = currentFont.widthOfTextAtSize(testLine, size);
      
      if (lineWidth > maxWidth && line) {
        page.drawText(line, {
          x: margin,
          y,
          size,
          font: currentFont,
          color: rgb(0, 0, 0),
        });
        y -= size * lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: currentFont,
        color: rgb(0, 0, 0),
      });
      y -= size * lineHeight;
    }
  };
  
  // Helper to add paragraph with spacing
  const addParagraph = (text: string, size = 11) => {
    addText(text, size);
    y -= 10;
  };
  
  // Title
  addText('COLLABORATION AGREEMENT', 16, true);
  y -= 5;
  addText('BETWEEN THE BRAND VECINO CUSTOM AND CONTENT CREATOR', 12, true);
  y -= 20;
  
  // Between parties
  addParagraph(`Between the parties:`);
  addParagraph(`VECINO CUSTOM, a registered brand owned by the company BRILLOSCURO LDA, with its registered office at RUA COMENDADOR SÁ COUTO 112, 4520-192 SANTA MARIA DA FEIRA, tax identification number 517924773, hereinafter referred to as the "first contracting party", and`);
  addParagraph(`${data.influencerName} (@${data.influencerHandle}), hereinafter referred to as the "second contracting party",`);
  y -= 10;
  
  addParagraph(`Enter into the present Collaboration Agreement, which shall be governed by the following clauses:`);
  y -= 10;
  
  // Clause 1
  addText('1. Purpose of the Collaboration', 12, true);
  addParagraph(`The purpose of this partnership is the creation of original digital content by the second contracting party, with the aim of promoting the products of the VECINO CUSTOM brand, namely ${data.productDescription || 'a personalized piece of jewelry'}.`);
  y -= 10;
  
  // Clause 2
  addText('2. Collaboration Terms', 12, true);
  y -= 5;
  
  addText('On the part of the first contracting party:', 11, true);
  addParagraph('• Free delivery of 1 personalized piece of jewelry, selected by the brand based on the personal style of the second contracting party, who may share their preferences.');
  addParagraph(`• Assignment of an exclusive discount code, which provides: 1. A 10% discount for the second contracting party's community; 2. A ${data.commissionRate}% commission on each sale made using the aforementioned code.`);
  addParagraph(`• Payment of a fixed remuneration in the amount of ${data.agreedPrice}€.`);
  y -= 5;
  
  addText('On the part of the second contracting party:', 11, true);
  addParagraph('• Creation and publication of one creative video and one photograph on their social media platforms, with an emotional and aesthetic focus, aligned with the brand\'s identity.');
  addParagraph('• The video shall be published on TikTok and Instagram Reels, and the picture shall be published on Instagram Stories and sent to the first contracting party.');
  addParagraph('• The content must be completed and published within 5 days after receiving the product.');
  addParagraph('• The created content must be submitted in advance to the first contracting party for approval prior to publication.');
  y -= 10;
  
  // Clause 3
  addText('3. Ownership and Usage Rights', 12, true);
  addParagraph('• The content shall remain the intellectual property of the second contracting party; however, the first contracting party shall have full usage rights and may share it on its digital platforms (Instagram, TikTok, Website, Email Marketing) with proper credit given.');
  addParagraph('• The first contracting party is expressly authorized to use the content in paid advertising campaigns and sponsored posts, without the need for further authorization.');
  addParagraph('• The second contracting party agrees to provide the necessary access codes (TikTok and Instagram) to enable the promotion of the content.');
  y -= 10;
  
  // Clause 4
  addText('4. Remuneration and Commissions', 12, true);
  addParagraph(`• This collaboration includes the provision of a product, a sales commission (${data.commissionRate}%), and a fixed remuneration (${data.agreedPrice}€).`);
  addParagraph('• Commission payments will be made monthly, by the 10th day of each month.');
  addParagraph('• Payment of the fixed remuneration and commissions shall only be made after: 1. Delivery and publication of the approved content; 2. Delivery of the necessary access codes for sponsorship; 3. Issuance of a receipt/invoice by the second contracting party.');
  addParagraph('• Payment will be made by bank transfer to the IBAN provided by the second contracting party.');
  y -= 10;
  
  // Clause 5
  addText('5. Confidentiality and Dispute Resolution', 12, true);
  addParagraph('• Both parties agree to maintain the confidentiality of all information exchanged within the scope of this collaboration, including financial details, strategies, terms of the agreement, and any unpublished content.');
  addParagraph('• Any conflict or disagreement arising from this collaboration shall first be resolved amicably between the parties.');
  addParagraph('• If it is not possible to reach an understanding, both parties agree that any dispute shall be governed by Portuguese law, with the court of the district of Santa Maria da Feira being the competent authority to settle any legal matters.');
  y -= 10;
  
  // Clause 6
  addText('6. Duration and Termination', 12, true);
  addParagraph('• This agreement shall enter into force on the date of its acceptance by both parties and shall remain in effect for an indefinite period, being subject to termination by either party upon five (5) business days\' prior notice, without penalty.');
  addParagraph('• Should the second contracting party express in writing their intention to prohibit future use of the content, such decision shall not have retroactive effect.');
  y -= 10;
  
  // Clause 7
  addText('7. Final Considerations', 12, true);
  addParagraph('• Both parties agree to maintain clear, cordial, and professional communication throughout the collaboration.');
  addParagraph('• Any amendment or addition to this agreement must be made in writing and agreed upon by both parties.');
  addParagraph('• By accepting this agreement, both parties declare their full agreement with the points described above.');
  addParagraph('• In the event that the second contracting party is a minor, this agreement must be signed by their legal representative, who hereby: (i) authorizes the minor to participate in this collaboration; (ii) assumes full legal responsibility for all obligations arising from this agreement until the minor reaches the age of majority; and (iii) confirms that the representation is valid and compliant with Portuguese law.');
  y -= 20;
  
  // Digital Signature Section
  addText('DIGITAL ACCEPTANCE', 14, true);
  y -= 10;
  
  addParagraph(`This contract was digitally accepted by ${data.influencerName} (@${data.influencerHandle}) on ${data.date}.`);
  y -= 5;
  
  if (data.ipAddress) {
    addParagraph(`IP Address: ${data.ipAddress}`);
  }
  if (data.userAgent) {
    addParagraph(`Device: ${data.userAgent.substring(0, 100)}...`);
  }
  
  // Hash for integrity
  const hash = Buffer.from(`${data.influencerName}-${data.date}-${data.agreedPrice}`).toString('base64');
  addParagraph(`Document Hash: ${hash}`);
  y -= 10;
  
  addParagraph('This digital acceptance constitutes a valid electronic signature under Portuguese and EU law (eIDAS Regulation).');
  y -= 20;
  
  // Location and Date
  addText(`Santa Maria da Feira, ${data.date}`, 11);
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
