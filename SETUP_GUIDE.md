# 🛒 Mane Bazar — Production Setup & Deployment Guide

**Complete guide for setting up and deploying Mane Bazar for production use**

---

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Razorpay Payment Integration](#razorpay-payment-integration)
5. [WhatsApp + UPI Integration](#whatsapp--upi-integration)
6. [Running the Application](#running-the-application)
7. [Verification Checklist](#verification-checklist)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Step 1: Clone and Navigate

```bash
git clone https://github.com/codewithharshx/mane-bazar
cd mane-bazar
```

### Step 2: Run Setup

**On Windows:**
```bash
run.bat
```

**On macOS/Linux:**
```bash
bash run.sh  # If script exists
# Or manually:
cd server && npm install && cd ../client && npm install && cd ..
```

---

## Environment Configuration

### Backend (.env)

Create `server/.env` with the following variables:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_MEMORY_SERVER=true
# For production, uncomment and set your MongoDB Atlas URI:
# MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your-64-character-secret-key-minimum-for-production
JWT_REFRESH_SECRET=your-64-character-refresh-secret-key-for-production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Frontend
CLIENT_URL=http://localhost:5173
CORS_WHITELIST=http://localhost:5173

# Razorpay (Setup in later section)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_key_secret

# WhatsApp + UPI
UPI_ID=merchant@upi
UPI_MERCHANT_NAME=Mane Bazar
WHATSAPP_ENABLED=false
WHATSAPP_API_URL=https://example.com/whatsapp/send
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_ADMIN_NUMBER=919011189191

# Cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

### Frontend (.env.local)

Create `client/.env.local` with:

```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
VITE_ENV=development
```

---

## Database Setup

### Development (In-Memory MongoDB)

✅ **Already configured** — Uses MongoDB Memory Server automatically
- No Atlas account required
- Perfect for local development and testing
- Data resets when server restarts

### Production (MongoDB Atlas)

1. **Sign up** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a cluster** (Free tier available)
3. **Get connection string**:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
4. **Update server/.env**:
   ```env
   MONGODB_MEMORY_SERVER=false
   MONGO_URI=your_mongodb_connection_string
   ```

**Important**: Replace `<password>` with your actual password and `mane-bazar` with your database name.

---

## WhatsApp + UPI Integration

Configure these variables in `server/.env` for order confirmations:

```env
UPI_ID=merchant@upi
UPI_MERCHANT_NAME=Mane Bazar
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://your-provider.example/send
WHATSAPP_API_KEY=your_provider_token
WHATSAPP_ADMIN_NUMBER=919011189191
```

Behavior:
- Dynamic UPI QR is generated per order with amount, merchant name, and order ID.
- Customer and admin receive structured WhatsApp order details.
- If WhatsApp config is missing, development mode logs payloads for safe fallback.

---

## Razorpay Payment Integration

### Step 1: Create Razorpay Account

1. Sign up at [Razorpay](https://razorpay.com/)
2. Verify email and phone
3. Complete KYC verification for live payments

### Step 2: Get Test Keys

1. Go to Dashboard → Settings → **API Keys**
2. You'll see **Key ID** and **Key Secret**
3. Use these for testing (they work with test card numbers)

### Step 3: Update Environment Files

**server/.env:**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test-secret-xxxx
```

**client/.env.local:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

### Test Payment Cards

Use these in checkout (development only):

| Card Number | CVV | Expiry | Status |
|---|---|---|---|
| 4111 1111 1111 1111 | Any | Any future date | Success |
| 4000 0000 0000 0002 | Any | Any future date | Failure |
| 5555 5555 5555 4444 | Any | Any future date | Success |

---

## Running the Application

### Development Mode (Both Servers)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

### Production Build

**Frontend:**
```bash
cd client
npm run build
# Creates optimized build in dist/
```

**Backend:**
```bash
cd server
npm start
# Runs compiled server
```

---

## Verification Checklist

### Backend Health

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/ready
```

Expected response:
```json
{
  "status": "ok",
  "service": "mane-bazar-api",
  "ts": "2026-04-09T12:00:00.000Z"
}
```

Readiness response should be:
```json
{
   "status": "ready",
   "service": "mane-bazar-api"
}
```

### Checkout Idempotency (Recommended)

For payment/order write calls, include an idempotency key header:

```bash
curl -X POST http://localhost:5000/api/orders/cod \
   -H "Authorization: Bearer <access_token>" \
   -H "Content-Type: application/json" \
   -H "x-idempotency-key: checkout-<unique-attempt-id>" \
   -d '{ ... }'
```

Behavior:
- Same key + same payload: previous success response is replayed safely.
- Same key + different payload: `409 Conflict`.

### Auth System

**Test Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Test123!"}'
```

**Test Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Test123!"}'
```

### Frontend

- ✅ Page loads at http://localhost:5173
- ✅ Register works
- ✅ Login works
- ✅ Products load
- ✅ Cart functions
- ✅ Order confirmation notifications are dispatched

### Database

- ✅ Products seeded (360+ items)
- ✅ Categories seeded (12 categories)
- ✅ Admin user created
- ✅ Coupons seeded

---

## Production Deployment

### Deployment Options

#### Option 1: Vercel (Frontend) + Heroku/Railway (Backend)

**Frontend on Vercel:**
1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy

**Backend on Railway:**
1. Create account at railway.app
2. Connect GitHub repo
3. Add environment variables
4. Deploy

#### Option 2: AWS (EC2 + RDS)

1. Launch EC2 instance (Ubuntu)
2. Install Node.js and npm
3. Clone repository
4. Set up RDS MongoDB (or use MongoDB Atlas)
5. Configure environment variables
6. Use PM2 to run server

#### Option 3: Docker Deployment

```dockerfile
# Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY server .
RUN npm install
EXPOSE 5000
CMD ["npm", "start"]
```

```dockerfile
# Dockerfile for frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY client .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Production Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=5000
MONGODB_MEMORY_SERVER=false
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=64-character-secure-random-secret-for-production-only
JWT_REFRESH_SECRET=64-character-secure-random-refresh-secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
CLIENT_URL=https://yourdomain.com
CORS_WHITELIST=https://yourdomain.com,https://www.yourdomain.com
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=live-secret-key
UPI_ID=merchant@upi
UPI_MERCHANT_NAME=Mane Bazar
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://your-provider.example/send
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_ADMIN_NUMBER=919011189191
```

---

## Troubleshooting

### Issue: CORS Error

**Solution:**
1. Check `CLIENT_URL` in server/.env
2. Verify frontend URL matches CORS_WHITELIST
3. Ensure browser isn't denying cookies (HTTPS in production)

### Issue: WhatsApp Notifications Not Working

**Solution:**
1. Verify `WHATSAPP_ENABLED=true`
2. Check `WHATSAPP_API_URL` and `WHATSAPP_API_KEY`
3. Confirm phone format and admin number include country code digits

### Issue: Database Connection Failed

**Solution:**
1. Check MongoDB URI is correct
2. Verify network access (whitelist your IP on MongoDB Atlas)
3. Check database credentials

### Issue: Payments Not Working

**Solution:**
1. Verify Razorpay keys are set correctly
2. Check you're using test keys for development
3. Verify test card numbers are correct

### Issue: Token Refresh Not Working

**Solution:**
1. Check `witCredentials: true` in axios config
2. Verify cookies are being saved
3. Ensure cookie settings match (secure, sameSite, etc.)

---

## Next Steps

1. **Admin Setup**: First admin account is created during seed
   - Email: admin@manebazar.com
   - Password: Admin@123
   - ⚠️ **Change this password immediately in production**

2. **Email Notifications** (Optional): Configure SMTP for order emails
   - Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

3. **Analytics**: Admin dashboard shows real-time metrics

4. **Security Hardening**:
   - Change all default admin credentials
   - Generate strong JWT secrets
   - Use HTTPS in production
   - Enable rate limiting
   - Set up logging

---

## Support & Documentation

- **GitHub Repository**: https://github.com/codewithharshx/mane-bazar
- **MongoDB Atlas Docs**: https://docs.mongodb.com/manual/
- **Razorpay Docs**: https://razorpay.com/docs/

---

**Last Updated**: April 2026
**Maintainer**: Harsh Kumar
