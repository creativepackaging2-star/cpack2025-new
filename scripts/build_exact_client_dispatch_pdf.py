import os
import subprocess
import pypdf
import base64

def get_base64_image(image_path):
    if os.path.exists(image_path):
        with open(image_path, "rb") as img_file:
            return f"data:image/png;base64,{base64.b64encode(img_file.read()).decode('utf-8')}"
    return ""

def generate_coa_html(order, company_config):
    logo_b64 = get_base64_image('public/logo_printers.png')
    sign_b64 = get_base64_image('public/sign_printers.png')

    date_str = order.get('date', '24/10/2026')
    mfg_date_str = order.get('mfg_date', '24/10/2026')
    qty_num = order.get('qty', 0)
    qty_str = f"{qty_num:,}" if isinstance(qty_num, (int, float)) else str(qty_num)

    # 5 standard tests exactly as in COATemplate.tsx
    # 1. Description
    desc_spec = order.get('specification') or order.get('specs') or '<<[Specification]>>'
    
    # 2. GSM
    gsm_val = order.get('gsm_value', '')
    gsm_spec = f"{gsm_val} +/- 5%" if gsm_val else '<<[gsm]>> +/- 5%'
    gsm_sub = f'<div style="font-size: 10px; color: #64748b;">{gsm_val}</div>' if gsm_val else ''

    # 3. Construction
    const_val = order.get('construction') or order.get('construction_type') or 'As per approved specimen'
    folding_dim = order.get('folding_dim') or order.get('folding_dimension') or ''
    is_insert = 'insert' in (order.get('category_name') or '').lower() or 'leaflet' in (order.get('product_name') or '').lower()
    if is_insert and folding_dim:
        const_spec = f"{const_val} ({folding_dim})"
        const_sub = f'<div style="font-size: 10px; color: #64748b;">({folding_dim})</div>'
    else:
        const_spec = const_val
        const_sub = ''

    # 4. Dimensions
    dim_val = order.get('dimension', '')
    dim_spec = f"{dim_val} mm +/-2mm" if dim_val else '<<[Dimension]>>mm +/-2mm'
    dim_sub = f'<div style="font-size: 10px; color: #64748b;">{dim_val}</div>' if dim_val else ''

    # 5. Shade
    shade_spec = "Will comply with shade"

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate of Analysis</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Herr+Von+Muellerhoff&display=swap');
        
        @page {{
            size: A4 portrait;
            margin: 0;
        }}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: black;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}

        .coa-page {{
            width: 210mm;
            min-height: 297mm;
            padding: 20mm 18mm 15mm 18mm;
            margin: 0 auto;
            position: relative;
            background: white;
            display: flex;
            flex-direction: column;
        }}

        .font-signature {{
            font-family: 'Great Vibes', cursive;
        }}

        .font-signature-alt {{
            font-family: 'Herr Von Muellerhoff', cursive;
        }}

        .header {{
            border-bottom: 2px solid #1e293b;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }}

        .header-top {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }}

        .logo {{
            width: 200px;
            height: auto;
        }}

        .header-info {{
            font-size: 11px;
            font-weight: 500;
            color: #475569;
            margin-top: 6px;
        }}

        .header-info p {{
            margin-bottom: 2px;
        }}

        .title-box {{
            text-align: center;
            margin-bottom: 20px;
        }}

        .title {{
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid black;
            display: inline-block;
            padding-bottom: 3px;
        }}

        .customer-section {{
            margin-bottom: 18px;
            font-size: 13px;
        }}

        .customer-row {{
            display: flex;
            margin-bottom: 4px;
        }}

        .customer-label {{
            width: 140px;
            font-weight: bold;
            color: #1e293b;
            flex-shrink: 0;
        }}

        .customer-value {{
            font-weight: 600;
            flex-grow: 1;
        }}

        .order-details-box {{
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 13px;
            background-color: #f8fafc;
        }}

        .details-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 24px;
            row-gap: 8px;
        }}

        .detail-row {{
            display: flex;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }}

        .detail-row.col-span-2 {{
            grid-column: span 2;
        }}

        .detail-label {{
            width: 120px;
            font-weight: bold;
            color: #334155;
            flex-shrink: 0;
        }}

        .detail-value {{
            font-weight: 500;
            color: #0f172a;
        }}

        .detail-value.bold {{
            font-weight: bold;
        }}

        .table-container {{
            margin-bottom: 24px;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #1e293b;
            font-size: 13px;
        }}

        th {{
            border: 1px solid #1e293b;
            padding: 8px;
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: left;
        }}

        th.text-center {{
            text-align: center;
        }}

        td {{
            border: 1px solid #1e293b;
            padding: 8px;
            vertical-align: middle;
        }}

        td.text-center {{
            text-align: center;
        }}

        td.font-medium {{
            font-weight: 500;
        }}

        .ok-text {{
            font-weight: bold;
            color: #047857;
        }}

        .signatures-section {{
            margin-top: auto;
            padding-top: 16px;
        }}

        .sign-row {{
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 16px;
        }}

        .sign-col {{
            font-size: 13px;
        }}

        .sign-col.text-right {{
            text-align: right;
        }}

        .sign-name {{
            font-weight: bold;
            color: #334155;
        }}

        .script-sign {{
            margin-top: 4px;
            font-size: 36px;
            color: #1e3a8a;
            transform: rotate(-3deg);
            margin-left: 8px;
            line-height: 1;
        }}

        .script-sign-right {{
            margin-top: 4px;
            font-size: 36px;
            color: #1e3a8a;
            transform: rotate(-2deg);
            margin-right: 12px;
            line-height: 1;
        }}

        .for-company {{
            text-align: right;
            font-size: 13px;
        }}

        .for-company-title {{
            color: #1d4ed8;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 14px;
        }}

        .proprietor-box {{
            margin-top: 6px;
            display: flex;
            justify-content: flex-end;
        }}

        .proprietor-content {{
            text-align: center;
            position: relative;
        }}

        .sign-img {{
            height: 28px;
            width: auto;
            margin-bottom: 4px;
        }}

        .proprietor-label {{
            color: #1d4ed8;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            border-top: 1px solid #cbd5e1;
            padding-top: 3px;
            display: inline-block;
            padding-left: 14px;
            padding-right: 14px;
        }}
    </style>
</head>
<body>
    <div class="coa-page">
        <!-- Header -->
        <div class="header">
            <div class="header-top">
                <img src="{logo_b64}" alt="{company_config['name']}" class="logo">
            </div>
            <div class="header-info">
                <p>{company_config['address']}</p>
                <p style="margin-top: 4px;">Email: {company_config['email']} | M: {company_config['mobile']} | GSTN: {company_config['gstn']}</p>
            </div>
        </div>

        <!-- Title -->
        <div class="title-box">
            <h1 class="title">Certificate of Analysis</h1>
        </div>

        <!-- Customer Section -->
        <div class="customer-section">
            <div class="customer-row">
                <span class="customer-label">Customer Name:</span>
                <span class="customer-value">{order.get('customer_name', '')}</span>
            </div>
            <div class="customer-row">
                <span class="customer-label">Address:</span>
                <span class="customer-value" style="white-space: pre-wrap;">{order.get('delivery_address', '')}</span>
            </div>
        </div>

        <!-- Order Details List (EXACT 7 fields, NO PO No) -->
        <div class="order-details-box">
            <div class="details-grid">
                <div class="detail-row">
                    <span class="detail-label">Date :</span>
                    <span class="detail-value">{date_str}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Mfg.:</span>
                    <span class="detail-value">{mfg_date_str}</span>
                </div>

                <div class="detail-row col-span-2">
                    <span class="detail-label">Product Name :</span>
                    <span class="detail-value bold">{order.get('product_name', '')}</span>
                </div>

                <div class="detail-row">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">{qty_str}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Batch No:</span>
                    <span class="detail-value">{order.get('batch_no', '')}</span>
                </div>

                <div class="detail-row">
                    <span class="detail-label">Invoice No:</span>
                    <span class="detail-value">{order.get('invoice_no', '')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Artwork Code:</span>
                    <span class="detail-value">{order.get('artwork_code', '')}</span>
                </div>
            </div>
        </div>

        <!-- Analysis Table (EXACT 5 Tests - No extra tests, no modifications) -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 56px;">Sr No</th>
                        <th style="width: 130px;">Test</th>
                        <th>Specification</th>
                        <th class="text-center" style="width: 130px;">Observation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="text-center">1</td>
                        <td class="font-medium">Description</td>
                        <td>{desc_spec}</td>
                        <td class="text-center ok-text">OK</td>
                    </tr>
                    <tr>
                        <td class="text-center">2</td>
                        <td class="font-medium">GSM</td>
                        <td>{gsm_spec}</td>
                        <td class="text-center">
                            <span class="ok-text">OK</span>
                            {gsm_sub}
                        </td>
                    </tr>
                    <tr>
                        <td class="text-center">3</td>
                        <td class="font-medium">Construction</td>
                        <td>{const_spec}</td>
                        <td class="text-center">
                            <span class="ok-text">OK</span>
                            {const_sub}
                        </td>
                    </tr>
                    <tr>
                        <td class="text-center">4</td>
                        <td class="font-medium">Dimensions</td>
                        <td>{dim_spec}</td>
                        <td class="text-center">
                            <span class="ok-text">OK</span>
                            {dim_sub}
                        </td>
                    </tr>
                    <tr>
                        <td class="text-center">5</td>
                        <td class="font-medium">Shade</td>
                        <td>{shade_spec}</td>
                        <td class="text-center ok-text">OK</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Signature Section (EXACT official signatures) -->
        <div class="signatures-section">
            <div class="sign-row">
                <div class="sign-col">
                    <p class="sign-name">Checked By : Laxman</p>
                    <div class="font-signature-alt script-sign">LS</div>
                </div>
                <div class="sign-col text-right">
                    <p class="sign-name">Approved By : Saahil</p>
                    <div class="font-signature-alt script-sign-right">Sps</div>
                </div>
            </div>

            <div class="for-company">
                <p class="for-company-title">For {company_config['name']}</p>
                <div class="proprietor-box">
                    <div class="proprietor-content">
                        <div style="height: 28px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                            <img src="{sign_b64}" alt="{company_config['proprietor_label']}" class="sign-img">
                        </div>
                        <p class="proprietor-label">{company_config['proprietor_label']}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""
    return html

def convert_html_to_pdf(html_content, output_pdf_path):
    abs_pdf = os.path.abspath(output_pdf_path)
    abs_html = os.path.abspath(output_pdf_path.replace('.pdf', '.html'))
    with open(abs_html, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={abs_pdf}",
        f"file:///{abs_html}"
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(abs_html):
        os.remove(abs_html)
    print(f"Generated PDF: {abs_pdf}")

def main():
    company_config = {
        'name': 'CREATIVE PRINTERS',
        'address': '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
        'email': 'creativepackaging@outlook.com',
        'mobile': '8097032001',
        'gstn': '27CGTPS8217E1ZT',
        'proprietor_label': 'Proprietor',
    }

    orders = [
        {
            'pdf': 'coa_exact_1754.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'mfg_date': '24/10/2026',
            'product_name': 'Tigipure Carton',
            'qty': 29000,
            'batch_no': 'TIGIPU241026C',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/C2',
            'category_name': 'Cartons',
            'specification': 'Printed Carton On Itc Saffire Board With 3 Special Colour Printing With Foiling & Embossing Aqua Varnish For Batch Coding',
            'gsm_value': '350',
            'construction_type': 'Window Varnish Batch Coding.',
            'dimension': '95 x 35 x 78'
        },
        {
            'pdf': 'coa_exact_1756.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'mfg_date': '24/10/2026',
            'product_name': 'Tigipure Insert',
            'qty': 28000,
            'batch_no': 'TIGIPU241026I',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/I2',
            'category_name': 'Inserts',
            'specification': 'Printed Insert On Maplitho Paper.',
            'gsm_value': '60',
            'construction_type': 'Folding ‐ 2 + 3',
            'folding_dim': '50 x 50',
            'dimension': '400 x 200'
        },
        {
            'pdf': 'coa_exact_1757.pdf',
            'customer_name': 'BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA',
            'delivery_address': 'Survey No. 51/1, At Vanseti Village, PO: Tajpura, Dist. Panchamahals, Taluka – Halol, 389350 Gujarat, India',
            'date': '24/10/2026',
            'mfg_date': '24/10/2026',
            'product_name': 'Tigipure 50 mg Label',
            'qty': 30000,
            'batch_no': 'TIGIPU241026L',
            'invoice_no': 'S-2627-1059',
            'artwork_code': 'YS0TGAXIN/L3',
            'category_name': 'Labels',
            'specification': 'Printed Label On Chromo Paper With 4 Special Pantone Colour Printing.',
            'gsm_value': '75',
            'construction_type': 'Window Varnish Batch Coding.',
            'dimension': '20  x  62'
        }
    ]

    coa_pdfs = []
    for o in orders:
        html = generate_coa_html(o, company_config)
        convert_html_to_pdf(html, o['pdf'])
        coa_pdfs.append(o['pdf'])

    # Build 6-page unified document
    writer = pypdf.PdfWriter()

    # Add 3 identical copies of official Zoho Invoice S-2627-1059
    inv_pdf_path = r'C:\Users\Admin\Downloads\S-2627-1059_zoho.pdf'
    inv_reader = pypdf.PdfReader(inv_pdf_path)
    inv_page = inv_reader.pages[0]

    for i in range(3):
        writer.add_page(inv_page)
        print(f"Added Invoice Copy {i+1}")

    # Add the 3 exact official COAs
    for pdf_file in coa_pdfs:
        c_reader = pypdf.PdfReader(pdf_file)
        for p in c_reader.pages:
            writer.add_page(p)
        print(f"Added exact COA: {pdf_file}")

    out_public = 'public/downloads/Dispatch_Documents_S-2627-1059.pdf'
    os.makedirs('public/downloads', exist_ok=True)

    with open(out_public, 'wb') as f:
        writer.write(f)
    print(f"Saved to: {out_public}")

    # Write to Downloads folder (with fallback if user has it locked in PDF viewer)
    out_downloads = r'C:\Users\Admin\Downloads\Dispatch_Documents_S-2627-1059.pdf'
    try:
        with open(out_downloads, 'wb') as f:
            writer.write(f)
        print(f"Saved to: {out_downloads}")
    except PermissionError:
        out_downloads_alt = r'C:\Users\Admin\Downloads\Dispatch_Package_S-2627-1059.pdf'
        with open(out_downloads_alt, 'wb') as f:
            writer.write(f)
        print(f"File was locked in PDF reader, saved copy to: {out_downloads_alt}")

    # Clean up temporary single coa pdfs
    for f in coa_pdfs:
        if os.path.exists(f):
            os.remove(f)

    print("Successfully built exact client COA package!")
    print(f"Saved to: {out_downloads}")
    print(f"Saved to: {out_public}")

if __name__ == '__main__':
    main()
