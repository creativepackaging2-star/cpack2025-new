# Implementation Plan: App Security & Authentication

This plan outlines the steps to secure the CPack Manufacturing application using Supabase Authentication.

## Objectives
1.  **Secure all routes**: Ensure only logged-in users can access the dashboard, products, orders, etc.
2.  **Premium Login Experience**: Provide a professional, themed login screen.
3.  **Session Management**: Maintain user sessions across page reloads.

## Proposed Changes

### 1. Authentication Foundation
- [x] **Create `AuthProvider.tsx`**: A React Context provider to manage and distribute the user session throughout the app.
- [x] **Update `RootLayout`**: Wrap the entire application in the `AuthProvider` within `src/app/layout.tsx`.

### 2. Login Page
- [x] **Create `login/page.tsx`**: A dedicated login page styled with the app's dark aesthetic, featuring email/password fields and error handling.

### 3. Route Protection
- [x] **Modify `LayoutClient.tsx`**: 
    - Implement logic to check if a user is authenticated.
    - If a user is **not** logged in and tries to access any page (except `/login` and `/coa`), redirect them to the Login page.
    - Show a loading spinner while the session is being verified.

### 4. User Session UI
- [x] **Update `Sidebar.tsx`**:
    - Display the logged-in user's email.
    - Add a "Sign Out" button to allow users to securely end their session.

## User Authorization Guide
To grant access to a new user:
1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** > **Users**.
3.  Click **Add User** > **Create new user**.
4.  Enter the email and password for the user.
5.  The user can now log in through the application's login screen.

## Verification
- [x] Navigating to `/` while logged out should redirect to `/login`.
- [x] Successful login should redirect to the Dashboard.
- [x] "Sign Out" should clear the session and redirect back to `/login`.
