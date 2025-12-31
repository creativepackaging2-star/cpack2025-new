import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const filenameFromForm = data.get('filename') as string;

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
        }

        // Get file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Use provided filename or original name
        const name = filenameFromForm || file.name;
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Google Drive Setup
        const GOOGLE_DRIVE_FOLDER_ID = '1bTLjx1RVZRrOapo1rd81iepFrye6SXIY';

        // Service Account credentials from environment
        const credentials = {
            type: 'service_account',
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        };

        // Create auth client
        const auth = new google.auth.GoogleAuth({
            credentials: credentials as any,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Upload to Google Drive
        const fileMetadata = {
            name: safeName,
            parents: [GOOGLE_DRIVE_FOLDER_ID],
        };

        const media = {
            mimeType: file.type || 'application/octet-stream',
            body: require('stream').Readable.from(buffer),
        };

        const driveFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make file publicly accessible
        await drive.permissions.create({
            fileId: driveFile.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        const fileLink = driveFile.data.webViewLink || `https://drive.google.com/file/d/${driveFile.data.id}/view`;

        console.log(`Uploaded to Google Drive: ${fileLink}`);

        return NextResponse.json({
            success: true,
            filename: safeName,
            path: fileLink,
            fileId: driveFile.data.id
        });

    } catch (error: any) {
        console.error('Google Drive Upload Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Upload failed'
        }, { status: 500 });
    }
}
