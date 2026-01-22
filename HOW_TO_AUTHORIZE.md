# How to Authorize Users for CPack Admin

To maintain high security, new users can only be added through the **Supabase Dashboard**. This prevents unauthorized people from creating accounts on your website.

### Step-by-Step Guide

1.  **Open your Supabase Dashboard**: 
    Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and select your project.

2.  **Go to the Authentication Tab**:
    On the left sidebar, click the **Authentication** icon (it looks like a person with a shield).

3.  **Add a New User**:
    - Click the **Add User** button.
    - Select **Create new user**.
    - Enter the **Email** and **Password** you want to use for the admin account.
    - Click **Create user**.

4.  **Confirm the User**:
    The user will now appear in your list. They can immediately log in to the application at `http://localhost:3000/login` (or your live URL).

### Security Notes
- **Email Confirmation**: By default, Supabase might require email confirmation. You can disable this in **Authentication > Settings > Email Auth** by turning off "Confirm email".
- **Unique Access**: Each user has their own secure session.
- **Monitoring**: You can see when users last logged in directly on the Supabase dashboard.
