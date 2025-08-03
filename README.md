# Leads Master Scripts

A comprehensive Apps Script project for leads management with robust testing and deployment safety.

## 📁 Project Structure

```
apps-script-projects/
├── leads-master/           # Apps Script files (pushed to Google)
│   ├── Airtable.js        # Main Airtable integration
│   ├── Helpers.js         # Utility functions
│   ├── Qualify.js         # Lead qualification
│   ├── EnrichmentAgent.js # Data enrichment
│   ├── Scraper.js         # Google Maps scraping
│   ├── Reporting.js       # Analytics & reporting
│   ├── Archiver.js        # Lead archiving
│   ├── API.js             # External API integration
│   ├── test-suite/        # Testing framework
│   └── .clasp.json        # Clasp configuration
├── test-suite/            # Test framework files
├── scripts/               # Development tools
├── debug-tools/           # Debug utilities
├── package.json           # Node.js dependencies
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- Google Apps Script CLI (clasp)
- Google Cloud Project with Apps Script API enabled

### Setup
```bash
# Install dependencies
npm install

# Setup the project
npm run setup

# Run tests
npm test
```

## 📋 Available Commands

### Testing
```bash
npm test              # Run full test suite
npm run test:quick    # Run quick tests only
npm run test:full     # Run comprehensive tests
```

### Deployment
```bash
npm run push          # Test + push to Apps Script
npm run push:force    # Push without tests (DANGEROUS!)
npm run deploy        # Test + push + confirmation
```

### Monitoring
```bash
npm run health        # Check system health
npm run emergency     # Emergency disable functions
npm run coverage      # Run coverage analysis
```

## 🛡️ Safety Features

### Pre-Push Testing
All deployments are automatically tested before pushing:
- ✅ Functionality validation
- ✅ Syntax checking
- ✅ API safety checks
- ✅ Sheet modification safety

### Emergency Procedures
If deployment causes issues:
1. Run `npm run emergency` to disable critical functions
2. Contact development team immediately
3. Provide error details and context

## 🧪 Testing Framework

### Test Categories
- **Core Functions**: Header mapping, column indexing, skip logic
- **Data Processing**: Lead qualification, deduplication, enrichment
- **External Integrations**: Airtable API, RapidAPI, OpenRouter
- **Safety Checks**: API calls, sheet modifications, error handling

### Running Tests
```bash
# Quick test (basic functionality)
npm run test:quick

# Full test suite (comprehensive)
npm run test:full

# Coverage analysis
npm run coverage
```

## 📊 Test Coverage

### Currently Tested
- ✅ Header map functionality
- ✅ Column index lookup
- ✅ Skip logic validation
- ✅ Data extraction
- ✅ End-to-end process simulation

### Missing Tests (Priority)
- ⚠️ Airtable API calls
- ⚠️ Bad records identification/deletion
- ⚠️ Lead qualification transfer
- ⚠️ Data enrichment processing

## 🔧 Development Workflow

### Before Making Changes
1. Run `npm test` to ensure current state is working
2. Make your changes
3. Run `npm test` again to validate changes
4. Run `npm run push` to deploy safely

### Emergency Rollback
If issues occur after deployment:
1. Run `npm run emergency` immediately
2. Document the issue
3. Contact development team
4. Provide error logs and context

## 📁 File Descriptions

### Apps Script Files (leads-master/)
- **Airtable.js**: Main lead processing and Airtable integration
- **Helpers.js**: Utility functions and header mapping
- **Qualify.js**: Lead qualification and deduplication
- **EnrichmentAgent.js**: Data enrichment and extraction
- **Scraper.js**: Google Maps data collection
- **Reporting.js**: Analytics and reporting functions
- **Archiver.js**: Lead archiving and cleanup
- **API.js**: External API integrations

### Test Suite (test-suite/)
- **TestFramework.js**: Core testing framework
- **DeploymentSafety.js**: Deployment safety checks
- **TestRunner.js**: Easy test execution
- **TestCoverageAnalysis.js**: Coverage analysis

### Development Tools (scripts/)
- **pre-push-test.js**: Pre-deployment testing script

## ⚠️ Important Notes

### Never Deploy Without Testing
- Always run `npm test` before pushing
- Use `npm run push` instead of `clasp push` directly
- Monitor system health after deployment

### Emergency Procedures
- Keep `npm run emergency` ready
- Have rollback plan prepared
- Document all changes and issues

### Testing Best Practices
- Test with small batches first
- Monitor sales team feedback
- Have emergency procedures ready
- Document all test results

## 🆘 Support

If you encounter issues:
1. Check the test logs for specific errors
2. Run `npm run health` to diagnose issues
3. Use `npm run emergency` if critical functions are broken
4. Contact the development team with error details

## 📈 Coverage Goals

- **Phase 1**: Core Airtable functions (CRITICAL)
- **Phase 2**: Data processing functions (HIGH)
- **Phase 3**: External integrations (MEDIUM)
- **Phase 4**: Reporting & analytics (MEDIUM)
- **Phase 5**: Error handling (LOW)

**Current Coverage**: ~40% (Core functions tested)
**Target Coverage**: 80%+ (All critical functions tested) 