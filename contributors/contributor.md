# Contributors Page

This directory contains the contributors page for the WebDev100_Days project, featuring automatic GitHub integration and certificate generation.

## Features

### 🌟 GitHub Integration
- **Multiple API endpoints** with automatic failover (api.github.com + alternative proxies)
- **Enhanced retry mechanism** with 5 attempts and exponential backoff
- **Static fallback data** when all APIs fail to ensure page functionality
- **Extended caching** (2 hours) with expired cache fallback during outages
- **Request timeouts** (15s) to prevent hanging requests
- **Batch processing** with smaller batches (3 contributors) for better reliability
- Displays contributor profiles with avatars, names, and comprehensive stats

### 🎨 Modern Design
- Clean, professional UI with teal/green color scheme
- Gradient backgrounds and hover effects
- Responsive design that works on all devices
- Beautiful contributor cards with animated borders
- Enhanced loading states and error handling

### 🏆 Certificate Generation
- Automatically generates personalized completion certificates for contributors
- Enhanced certificate design with organizational branding
- Features the new certification text emphasizing 100-day challenge completion
- Includes dual signatures (Project Maintainer & Community Lead)
- Downloadable as high-quality PNG image
- Professional certificates suitable for portfolios and LinkedIn

## Files

- `contributor.html` - Main contributors page with modern responsive design
- `contributors.js` - JavaScript for GitHub API integration and certificate generation
- `contributor.css` - Additional CSS styles and responsive design fixes
- `contributor.md` - This documentation file

## How It Works

1. **Data Fetching**: The page fetches contributor information from multiple GitHub API endpoints with automatic failover
2. **Caching**: Data is cached in localStorage for 1 hour with fallback to expired cache during API outages
3. **Display**: Contributors are displayed in responsive cards showing their profile information
4. **Certificates**: Clicking the "Certificate" button generates a custom completion certificate
5. **Download**: Certificates can be downloaded as high-quality PNG images
6. **Error Handling**: Graceful degradation when APIs are unavailable with user-friendly error messages

## Configuration

To use this for your own repository, update the GitHub configuration in `contributors.js`:

```javascript
this.githubConfig = {
    owner: 'your-username',
    repo: 'your-repo-name',
    apiUrls: [
        'https://api.github.com',
        'https://ungh.cc/repos', // Alternative proxy
        'https://api.github.com'  // Retry main API
    ],
    currentApiIndex: 0
};

// Enable/disable static fallback when all APIs fail
this.useStaticFallback = true;
```

## API Reliability & Rate Limits

The GitHub API has rate limits and occasional outages:
- 60 requests per hour for unauthenticated requests
- 5000 requests per hour for authenticated requests

**Multi-layered Reliability System:**
- **Primary**: GitHub API (api.github.com)
- **Secondary**: Alternative API proxies (ungh.cc)
- **Tertiary**: Extended cache (2 hours) with expired cache fallback
- **Final**: Static fallback data to ensure page always works

**Additional Features:**
- ⏱️ **Request timeouts** (15 seconds) prevent hanging
- 🔄 **5 retry attempts** with exponential backoff (3-15 seconds)
- 📦 **Smaller batch processing** (3 items) for better success rates
- 🎯 **Promise.allSettled** to handle partial failures gracefully
- 📊 **Real-time status updates** during loading process
- 🛡️ **AbortController** to cancel timed-out requests

## Browser Compatibility

- Modern browsers with ES6+ support
- Canvas API support required for certificate generation
- localStorage support required for caching

## Customization

You can customize:
- Colors and themes in the CSS
- Certificate design in the `generateCertificate` function
- GitHub API endpoints and data fetching logic
- Animation and visual effects
