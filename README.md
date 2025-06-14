# 📱 Unified Store Notifier

Monitor App Store Connect and Google Play Console for app status changes and get notifications in Slack.

**Get real-time notifications when your mobile app releases change status across both iOS and Android platforms — all in one unified Slack channel.**

## ✨ Why Use This?

- 🔄 **Dual Platform Monitoring** - Track both App Store Connect and Google Play Console simultaneously
- 📢 **Unified Slack Notifications** - Single webhook configuration for all your app status updates
- 🔐 **Flexible Authentication** - Supports App Store Connect API keys and Google Play service accounts
- 🎯 **Zero Configuration Drift** - Set it once, monitor forever
- 💪 **Production Ready** - TypeScript-first with robust error handling and health monitoring

## 🖼️ Preview

### Slack notifications from App Store Connect
![App Store](docs/appstore.webp)

### Slack notifications from Google Play Console
![Play Store](docs/playstore.webp)

## 🚀 Quick Start

```bash
docker compose up -d
```

## ⚙️ Configuration

Create a `.env` file:

```bash
# Required: Slack Configuration
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
SLACK_CHANNEL_NAME="#app-releases"

# App Store Connect (choose one authentication method)
# Method 1: API Key (Recommended)
SPACESHIP_CONNECT_API_KEY="-----BEGIN PRIVATE KEY-----..."
SPACESHIP_CONNECT_API_KEY_ID="ABC123DEF4"
SPACESHIP_CONNECT_API_ISSUER_ID="12345678-1234-1234-1234-123456789012"

# Method 2: Username/Password (Legacy)
ITC_USERNAME="your-apple-id@example.com"
ITC_PASSWORD="your-app-specific-password"

# App Store Configuration
BUNDLE_IDENTIFIERS="com.yourcompany.app1,com.yourcompany.app2"
NUMBER_OF_BUILDS="2"

# Google Play Console
# The base64-encoded content of your Google Play service account JSON key.
# To get this value, run: base64 -i /path/to/your/google-play-key.json
GOOGLE_PLAY_JSON_KEY_DATA='fer05g945...'
GOOGLE_PLAY_PACKAGE_NAMES="com.yourcompany.app1,com.yourcompany.app2"

# Optional Configuration
POLL_TIME_IN_SECONDS="90"
```

For more information, see [CONFIGURATION.md](docs/CONFIGURATION.md).

## 📖 Technical Details

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.
