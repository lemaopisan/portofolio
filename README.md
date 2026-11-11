# Jerikho Stefian Portfolio

Static HTML, CSS, and JavaScript portfolio hosted on Vercel.

## Structure

- `index.html`: public homepage
- `assets/css/`: website styles, themes, carousel, and intro
- `assets/js/`: website behavior and public connection settings
- `assets/documents/`: current PDF CV
- `data/content.json`: bundled portfolio content and offline fallback
- `admin/`: content editor and connection guide
- `setup/supabase.sql`: database and storage setup
- `vercel.json`: deployment configuration

## Admin

Open `/admin/`. Before connecting Supabase, it shows setup instructions and an editor preview.
Follow `/admin/setup.html` for one-time setup. The connection file belongs at `assets/js/config.js`.
Use only the public publishable/anon key. Never commit passwords or secret/service-role keys.

After connection, publish text changes and upload PDFs through the admin without changing code.
Keep a content backup after major edits. Update `data/content.json` occasionally to refresh the fallback.

## Deployment

The website is at the repository root. No build/install command is needed; use Vercel's Other preset.
Commit and push to the connected production branch to deploy. Keep the `.git` folder when updating files.

## Username login

The admin form accepts a username and password. Supabase verifies the password against
`username@portfolio.invalid`; this is an internal identifier, not an email inbox.
For `batagoreng`, create `batagoreng@portfolio.invalid` in Authentication > Users with
Auto Confirm User enabled, then allowlist that new user UUID using the setup guide.
Creating an alias account does not transfer admin permission from an older email account.
Use the Supabase dashboard for password resets; email recovery is unavailable for this alias.
Usernames are case-insensitive. Passwords are never stored in this repository.
