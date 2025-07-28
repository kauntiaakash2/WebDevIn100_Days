# Contributors Page

This directory contains the contributors page for the WebDev100_Days project, featuring automatic GitHub integration and certificate generation.

## Features

### 🌟 GitHub Integration
- Automatically fetches contributor data from GitHub API
- Displays contributor profiles with avatars, names, and stats
- Shows contribution counts, followers, and repository information
- Caches data for 10 minutes to reduce API calls

### 🎨 Space-Themed Design
- Modern, space-themed dark UI with animated stars background
- Gradient animations and hover effects
- Responsive design that works on all devices
- Beautiful contributor cards with glowing borders

### 🏆 Certificate Generation
- Automatically generates personalized certificates for contributors
- Beautiful certificate design with contributor name and contribution count
- Downloadable as PNG image
- Professional-looking certificates suitable for portfolios

## Files

- `index.html` - Main contributors page with space-themed design
- `contributors.js` - JavaScript for GitHub API integration and certificate generation
- `styles.css` - Additional CSS styles and responsive design fixes

## How It Works

1. **Data Fetching**: The page fetches contributor information from the GitHub API
2. **Caching**: Data is cached in localStorage for 10 minutes to improve performance
3. **Display**: Contributors are displayed in cards showing their profile information
4. **Certificates**: Clicking the "Certificate" button generates a custom certificate
5. **Download**: Certificates can be downloaded as PNG images

## Configuration

To use this for your own repository, update the GitHub configuration in `contributors.js`:

```javascript
this.githubConfig = {
    owner: 'your-username',
    repo: 'your-repo-name',
    apiUrl: 'https://api.github.com'
};
```

## API Rate Limits

The GitHub API has rate limits:
- 60 requests per hour for unauthenticated requests
- 5000 requests per hour for authenticated requests

The page implements caching to minimize API calls and includes error handling for rate limit scenarios.

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
