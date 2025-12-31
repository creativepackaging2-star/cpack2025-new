# How to Configure Google Drive Uploads

Your application is set up to save uploaded files (PDFs, CDRs) directly to a **Google Drive Folder**.

## 1. Where do files skip?
Files are uploaded to the Google Drive folder with ID: `1bTLjx1RVZRrOapo1rd81iepFrye6SXIY`.
The system renames them cleanly (e.g., `ProductName_ART.pdf`) and generates a public view link.

## 2. Required Setup (Secrets)
For the upload to work, you must add your Google Service Account credentials to the `.env.local` file in the main project directory.

Open or create `.env.local` and add these lines:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggS... (your long key) ...\n-----END PRIVATE KEY-----\n"
GOOGLE_PRIVATE_KEY_ID=your-key-id
GOOGLE_CLIENT_ID=your-client-id
```

### Where to get these?
1. Go to **Google Cloud Console** (console.cloud.google.com).
2. Create or select a project.
3. Enable **Google Drive API**.
4. Go to **IAM & Admin** > **Service Accounts**.
5. Create a Service Account.
6. Go to **Keys** tab -> Add Key -> Create New Key (JSON).
7. Open the downloaded JSON file. It contains all the values you need above.

### Important: Permissions
You must **Share** the destination folder (`1bTLjx1RVZRrOapo1rd81iepFrye6SXIY`) with the `client_email` address of your service account (give it "Editor" access) so it can write files to it.
