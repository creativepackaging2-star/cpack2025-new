import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const filenameFromForm = data.get('filename') as string;

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Use provided filename (sanitized) or original name
        const name = filenameFromForm || file.name;
        // Basic sanitization
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // ignore if exists
        }

        const filepath = path.join(uploadDir, safeName);

        await writeFile(filepath, buffer);
        console.log(`Saved file to ${filepath}`);

        return NextResponse.json({ success: true, filename: safeName, path: `/uploads/${safeName}` });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
    }
}
