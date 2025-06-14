# 📜 Unified Store Notifier - Configuration Guide

## 🔗 Official Documentation Links

### 🍎 App Store Connect API Setup
**SPACESHIP_CONNECT_API_KEY, SPACESHIP_CONNECT_API_KEY_ID, SPACESHIP_CONNECT_API_ISSUER_ID**
- **Official Guide**: https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api
- **App Store Connect Portal**: https://appstoreconnect.apple.com/access/api
- **Detailed Setup**: https://docs.fastlane.tools/app-store-connect-api/

**Alternative: Username/Password (ITC_USERNAME, ITC_PASSWORD)**
- **App-Specific Passwords**: https://support.apple.com/en-us/HT204397
- **Apple ID Portal**: https://appleid.apple.com/account/manage

### 🤖 Google Play Console Service Account
**GOOGLE_PLAY_JSON_KEY_DATA**
- **Official Guide**: https://developers.google.com/android-publisher/getting_started
- **Service Account Setup**: https://cloud.google.com/iam/docs/service-accounts-create
- **Google Play Console**: https://play.google.com/console/developers
- **Detailed Steps**: https://developers.google.com/android-publisher/authorization

### 📱 App Identifiers
**BUNDLE_IDENTIFIERS & GOOGLE_PLAY_PACKAGE_NAMES**
- **App Store Connect**: https://appstoreconnect.apple.com/apps
- **Google Play Console**: https://play.google.com/console/developers

## 🔧 Quick Setup Guide

### 1. Slack Webhook
1. Create new [incoming webhook](https://appikworkspace.slack.com/marketplace/A0F7XDUAZ-incoming-webhooks)
2. Copy the webhook URL

### 2. App Store Connect API
1. Go to https://appstoreconnect.apple.com/access/api
2. Click "Generate API Key"
3. Give it a name and select "Developer" role
4. Download the `.p8` file
5. Note the Key ID and Issuer ID
6. Convert .p8 content to single line for env var

### 3. Google Play Service Account
1. Go to https://console.cloud.google.com/
2. Create project or select existing
3. Enable Google Play Developer API
4. Create Service Account
5. Download JSON key file
6. Base64 encode the JSON:
   ```bash
   base64 -i your-service-account.json
   ```
7. Link service account in Google Play Console

### 4. App Package Names
- **iOS**: Found in App Store Connect → Your App → App Information
- **Android**: Found in Google Play Console → Your App → Dashboard

## 📋 Verification Commands

```bash
# Test base64 decoding
echo "YOUR_BASE64_STRING" | base64 -d

# Verify JSON structure
echo "YOUR_BASE64_STRING" | base64 -d | jq .

# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_SLACK_WEBHOOK_URL
```

These links will guide you through getting all the necessary credentials for your unified store notifier!
