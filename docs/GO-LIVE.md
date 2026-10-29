# Going live

Everything in the code is ready. These steps need your own accounts, so they're yours to do. Allow about an hour, plus
waiting time for DNS. Do them in this order; each step gives you values the next one needs.

You'll end up with: the shop on your GoDaddy domain over HTTPS, real SMS login, orders in a managed Postgres database with
daily backups, and cash/UPI-on-delivery payments. Online payments switch on later, once Razorpay approves you.

---

## 1. Database — Neon (10 minutes)

1. Sign up at **neon.tech** and create a project. Name it `aditya-traders`.
2. Region: pick the one closest to India (Singapore, or Mumbai if it's listed). Remember which one; Vercel should match it.
3. Open **Connect**, choose the **pooled** connection, and copy the connection string (`postgresql://…`).
   This is your `DATABASE_URL`. Treat it like a password.

Neon's free plan includes point-in-time restore for recent history. Check the current limits on their pricing page.

## 2. Login — Google sign-in through Firebase (10 minutes, free)

Customers and staff log in with the Google account already on their phone: no SMS, no passwords, and it works on
Firebase's free Spark plan (no card needed). The mobile number the rider calls is asked for once, at checkout.

1. Go to **console.firebase.google.com** and create a project. Google Analytics isn't needed.
2. **Security → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email (yours) and save.
3. **Authentication → Settings → Authorized domains:** add `yourdomain.in` and `www.yourdomain.in` (your real domain), and
   your `*.vercel.app` address. `localhost` is there already.
4. **Settings (gear) → Project settings → General → Your apps → Web (`</>`)**: register an app (leave Firebase Hosting
   unticked), then copy `apiKey`, `authDomain`, `projectId` and `appId`.
5. Put your own Gmail in `OWNER_EMAILS` (step 3). Add staff later in **Console → Settings → Staff** by their Gmail.

Note: Google's sign-in doesn't open inside some in-app browsers (Instagram, Facebook). The site tells those customers to
open the link in Chrome. Links shared on WhatsApp open in Chrome on Android, so they're fine.

## 3. Hosting — Vercel (15 minutes)

1. Put the code on GitHub: create a **private** repository and push this folder to it (I can do this for you; just ask).
2. Sign up at **vercel.com** with GitHub, then **Add New → Project** and import the repository.
3. Before deploying, open **Environment Variables** and add these for *Production* (and *Preview* if you use it):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string from step 1 |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.yourdomain.in` |
   | `OWNER_EMAILS` | Owner's Gmail, e.g. `owner@gmail.com` (comma-separate if more than one) |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | from step 2 |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from step 2 |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | from step 2 |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | from step 2 |

4. **Settings → Functions → Function Region:** choose the region next to your Neon database (Singapore → `sin1`,
   Mumbai → `bom1`).
5. Deploy. The build runs `vercel-build`, which creates the database tables, loads the starter catalog, then builds the
   site. Open the `*.vercel.app` link it gives you and check that the shop loads.

## 4. Your domain — GoDaddy (10 minutes, then wait)

1. In Vercel: **Project → Settings → Domains → Add**, then enter `www.yourdomain.in`. Accept Vercel's suggestion to also add
   `yourdomain.in` and redirect it to `www`.
2. Vercel now shows the DNS records it wants, usually an **A** record for the bare domain and a **CNAME** for `www`.
   **Use exactly the values Vercel shows you.** They can differ between projects.
3. In GoDaddy: **My Products → your domain → DNS → Manage DNS.**
   - Delete GoDaddy's default **A** record for `@` (often labelled "Parked") and any existing **CNAME** for `www`.
   - Add the **A** record: Name `@`, Value *(Vercel's IP)*, TTL 1 hour.
   - Add the **CNAME**: Name `www`, Value *(Vercel's target)*, TTL 1 hour.
   - Leave MX records alone if you use email on this domain.
4. Back in Vercel, the domain turns green once DNS has spread. That's usually within an hour, but can take up to 48. Vercel
   issues the HTTPS certificate automatically.
5. Add the final domain to Firebase's **Authorized domains** if you haven't already (step 2.3). If you skip this, SMS login
   fails on your domain.

## 5. Set up the store (20 minutes)

1. Open `https://www.yourdomain.in/login` and tap **Continue with Google** with the owner's Gmail (the one in `OWNER_EMAILS`).
2. Go to **/console → Settings** and fill in:
   - The real shop address, phone number, GSTIN (or choose *Composition*), and state.
   - Opening hours, orders per slot, the pincodes you deliver to with their rough distance, and the fees.
   - **Staff:** add each packer and rider by name and mobile number.
   The yellow "Finish setting up" bar disappears once the essentials are filled in.
3. **Products & stock:** the starter catalog is sample data. Either edit it, or replace it with your real list using
   **Import CSV** (there's a sample format in the dialog). To hide a sample product, open it and choose **Remove from the shop**.
4. Read the four policy pages linked in the footer (`/legal/terms`, `privacy`, `refunds`, `shipping`). They describe how
   the app actually works and use your settings, but have a professional review them before launch.
5. Place a real test order from a phone, then pack it, send it out and deliver it with the code. Cancel it afterwards if
   you like.

## 6. Online payments — Razorpay (later, after KYC)

1. Sign up at **razorpay.com** and complete activation (KYC). They will check that your website has the policy pages and
   contact details, which it does.
2. **Account & Settings → Payment capture:** set to **Automatic**.
3. **Account & Settings → API keys:** generate keys. Start with **test mode** keys.
4. **Webhooks → Add:** URL `https://www.yourdomain.in/api/webhooks/razorpay`, events `payment.captured` and `order.paid`,
   and a secret you make up.
5. In Vercel add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`, then **Redeploy**.
6. In **/console → Settings**, switch on **Online payments**. Test with Razorpay's test UPI and cards, then swap in the
   live keys and redeploy.

---

## After launch

- **Backups:** Neon keeps restore points. Before big changes (such as a bulk product import), create a branch in Neon as a
  snapshot.
- **Errors:** Vercel → Project → Logs shows server errors. Shoppers see a friendly error page with a reference code that
  matches the log entry.
- **Updates:** push to the GitHub `main` branch and Vercel redeploys automatically, applying any new database migrations
  first.
- **Not built yet:** WhatsApp/SMS order updates (shoppers track orders on their order page instead), product photos (items
  show category icons), a delivery-partner API (partners are booked by hand and the tracking link pasted in), and a strict
  Content-Security-Policy (add once Firebase and Razorpay are both live and can be tested together).
