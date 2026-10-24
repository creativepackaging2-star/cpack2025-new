import os
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

def build_coa(filename, order_info):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=15*mm,
        rightMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    normal = styles['Normal']
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=normal,
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#475569')
    )
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=normal,
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=15,
        alignment=1, # Center
        spaceAfter=12
    )
    
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=normal,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )
    
    val_style = ParagraphStyle(
        'ValStyle',
        parent=normal,
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    tbl_hdr_style = ParagraphStyle(
        'TblHdr',
        parent=normal,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )
    
    tbl_cell_style = ParagraphStyle(
        'TblCell',
        parent=normal,
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    tbl_ok_style = ParagraphStyle(
        'TblOk',
        parent=normal,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.HexColor('#047857')
    )

    story = []

    # Header with Logo & Company Info
    logo_path = 'public/logo_printers.png'
    logo_img = RLImage(logo_path, width=48*mm, height=16*mm)
    
    comp_info = """<b>CREATIVE PRINTERS</b><br/>
14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA<br/>
Email: creativepackaging@outlook.com | M: 8097032001 | GSTN: 27CGTPS8217E1ZT"""
    
    hdr_table = Table([[logo_img, Paragraph(comp_info, header_style)]], colWidths=[55*mm, 125*mm])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1.2, colors.HexColor('#1e293b')),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 10))

    # Title
    story.append(Paragraph('<u>CERTIFICATE OF ANALYSIS</u>', title_style))
    story.append(Spacer(1, 4))

    # Customer Box
    cust_data = [
        [Paragraph('<b>Customer Name :</b>', label_style), Paragraph(order_info['customer_name'], val_style)],
        [Paragraph('<b>Address :</b>', label_style), Paragraph(order_info['delivery_address'], val_style)]
    ]
    cust_table = Table(cust_data, colWidths=[32*mm, 148*mm])
    cust_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 8))

    # Order Meta Table (2 cols)
    prod_name_formatted = '<b>' + order_info['product_name'] + '</b>'
    qty_formatted = str(order_info['qty']) + ' pcs'
    meta_data = [
        [
            Paragraph('<b>Date :</b>', label_style), Paragraph(order_info['date'], val_style),
            Paragraph('<b>Date of Mfg. :</b>', label_style), Paragraph(order_info['date'], val_style),
        ],
        [
            Paragraph('<b>Product Name :</b>', label_style), Paragraph(prod_name_formatted, val_style),
            Paragraph('<b>Quantity :</b>', label_style), Paragraph(qty_formatted, val_style),
        ],
        [
            Paragraph('<b>Batch No :</b>', label_style), Paragraph(order_info['batch_no'], val_style),
            Paragraph('<b>Invoice No :</b>', label_style), Paragraph(order_info['invoice_no'], val_style),
        ],
        [
            Paragraph('<b>Artwork Code :</b>', label_style), Paragraph(order_info['artwork_code'], val_style),
            Paragraph('<b>PO No :</b>', label_style), Paragraph(order_info.get('po_no', '4110029615'), val_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[28*mm, 62*mm, 28*mm, 62*mm])
    meta_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Analysis Table
    test_rows = [
        [
            Paragraph('<b>Sr No</b>', tbl_hdr_style),
            Paragraph('<b>Test</b>', tbl_hdr_style),
            Paragraph('<b>Specification</b>', tbl_hdr_style),
            Paragraph('<b>Observation</b>', tbl_hdr_style)
        ]
    ]
    for idx, t in enumerate(order_info['tests'], 1):
        test_rows.append([
            Paragraph(str(idx), tbl_cell_style),
            Paragraph(t['test'], label_style),
            Paragraph(t['spec'], tbl_cell_style),
            Paragraph(t['obs'], tbl_ok_style),
        ])
    
    test_table = Table(test_rows, colWidths=[14*mm, 34*mm, 102*mm, 30*mm])
    test_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#1e293b')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#334155')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(test_table)
    story.append(Spacer(1, 12))

    # Remarks & Signatures
    story.append(Paragraph('<b>Remarks:</b> Material conforms to the specified standards & customer specifications.', val_style))
    story.append(Spacer(1, 18))

    sign_path = 'public/sign_printers.png'
    sign_img = RLImage(sign_path, width=32*mm, height=13*mm)
    
    footer_table = Table([
        [
            Paragraph('<b>Prepared By:</b><br/>Quality Control', val_style),
            Paragraph('<b>Approved By:</b><br/>QC Manager', val_style),
            [Paragraph('<b>For CREATIVE PRINTERS</b>', label_style), sign_img, Paragraph('<b>Proprietor</b>', val_style)]
        ]
    ], colWidths=[60*mm, 60*mm, 60*mm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (2,0), (2,0), 'RIGHT'),
    ]))
    story.append(footer_table)

    doc.build(story)
    print(f'COA built: {filename}')

def main():
    orders = [
        {
            'file': 'coa_carton.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'product_name': 'Tigipure Carton (Carton for Tigipure IP)',
            'qty': '29,000',
            'batch_no': 'TIGIPU241026C',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/C2',
            'po_no': '4110029615',
            'tests': [
                {'test': 'Description', 'spec': 'Printed Carton On ITC Saffire Board With 3 Special Colour Printing With Foiling & Embossing Aqua Varnish For Batch Coding', 'obs': 'OK'},
                {'test': 'GSM', 'spec': '350 GSM +/- 5%', 'obs': 'OK (350)'},
                {'test': 'Construction', 'spec': 'Window Varnish Batch Coding, Side Pasting', 'obs': 'OK'},
                {'test': 'Dimensions', 'spec': '95 x 35 x 78 mm', 'obs': 'OK'},
                {'test': 'Shade & Printing', 'spec': '171, 186, Black as per approved shade card', 'obs': 'OK'},
                {'test': 'Varnish / Coating', 'spec': 'Aqua Varnish (Spot/Window for Coding)', 'obs': 'OK'}
            ]
        },
        {
            'file': 'coa_insert.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'product_name': 'Tigipure Insert (Leaflet for Tigipure IP)',
            'qty': '28,000',
            'batch_no': 'TIGIPU241026I',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/I2',
            'po_no': '4110029615',
            'tests': [
                {'test': 'Description', 'spec': 'Printed Insert On Maplitho Paper', 'obs': 'OK'},
                {'test': 'GSM', 'spec': '60 GSM +/- 5%', 'obs': 'OK (60)'},
                {'test': 'Construction / Folding', 'spec': 'Folding 2 + 3 (Folded Dimension: 50 x 50 mm)', 'obs': 'OK (50 x 50)'},
                {'test': 'Dimensions', 'spec': '400 x 200 mm open size', 'obs': 'OK'},
                {'test': 'Printing Colour', 'spec': 'BLACK as per approved artwork', 'obs': 'OK'}
            ]
        },
        {
            'file': 'coa_label.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'product_name': 'Tigipure 50 mg Label (Label for Tigipure IP)',
            'qty': '30,000',
            'batch_no': 'TIGIPU241026L',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/L3',
            'po_no': '4110029615',
            'tests': [
                {'test': 'Description', 'spec': 'Printed Label On Chromo Paper With 4 Special Pantone Colour Printing', 'obs': 'OK'},
                {'test': 'GSM', 'spec': '75 GSM +/- 5%', 'obs': 'OK (75)'},
                {'test': 'Construction', 'spec': 'Window Varnish For Batch Coding', 'obs': 'OK'},
                {'test': 'Dimensions', 'spec': '20 x 62 mm', 'obs': 'OK'},
                {'test': 'Coating / Finish', 'spec': 'Aqua Varnish', 'obs': 'OK'}
            ]
        }
    ]

    for o in orders:
        build_coa(o['file'], o)

    # Merge with 3 copies of Invoice
    writer = pypdf.PdfWriter()

    # Read Invoice
    inv_reader = pypdf.PdfReader(r'C:\Users\Admin\Downloads\S-2627-1059_zoho.pdf')
    inv_page = inv_reader.pages[0]

    # Add 3 identical copies of the invoice
    for i in range(3):
        writer.add_page(inv_page)
        print(f'Added Invoice Copy {i+1}')

    # Add COAs
    for o in orders:
        coa_reader = pypdf.PdfReader(o['file'])
        for p in coa_reader.pages:
            writer.add_page(p)
        print(f'Added COA: {o["product_name"]}')

    os.makedirs('public/downloads', exist_ok=True)
    out_public = 'public/downloads/Dispatch_Documents_S-2627-1059.pdf'
    out_downloads = r'C:\Users\Admin\Downloads\Dispatch_Documents_S-2627-1059.pdf'

    with open(out_public, 'wb') as f:
        writer.write(f)
    with open(out_downloads, 'wb') as f:
        writer.write(f)

    # Clean up intermediate coa files
    for o in orders:
        if os.path.exists(o['file']):
            os.remove(o['file'])

    print('Successfully generated unified package with 6 pages!')
    print(f'Saved to: {out_downloads}')
    print(f'Saved to: {out_public}')

if __name__ == '__main__':
    main()
