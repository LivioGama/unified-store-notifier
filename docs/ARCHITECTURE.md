# 📖 Unified Store Notifier - Architecture

### Architecture Overview

The unified system follows a clean, modular architecture:

```
unified-store-notifier/
├── core/                   # Core infrastructure
│   ├── poller.ts          # Unified polling orchestrator
│   ├── database.ts        # Centralized key-value store
│   ├── logger.ts          # Unified logging system
│   └── string-utilities.ts # Shared string formatting
├── platforms/             # Platform-specific modules
│   ├── app-store/         # App Store Connect integration
│   └── play-store/        # Google Play Console integration
├── notifications/         # Notification system
│   ├── slack-client.ts    # Unified Slack webhook client
│   ├── message-builder.ts # Platform-agnostic message builder
│   └── formatters/        # Platform-specific message formatters
├── config/                # Configuration management
│   └── environment.ts     # Environment variable handling
├── types/                 # TypeScript type definitions
└── main.ts               # Application entry point
```

## 📞 Support

- 📖 [Documentation](https://github.com/LivioGama/unified-store-notifier/wiki)
- 🐛 [Issue Tracker](https://github.com/LivioGama/unified-store-notifier/issues)
- 💬 [Discussions](https://github.com/LivioGama/unified-store-notifier/discussions)

---

**Made with ❤️ for the iOS and Android developer community**
