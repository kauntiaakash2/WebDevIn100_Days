// GitHub Contributors Manager with Certificate Generation
class ContributorsManager {
    constructor() {
        this.contributors = [];
        this.repoData = null;
        this.githubConfig = {
            owner: 'ruchikakengal',
            repo: 'WebDevIn100_Days',
            apiUrl: 'https://api.github.com'
        };
        this.cacheKey = 'contributors_cache_v1';
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        this.init();
    }

    async init() {
        try {
            await this.loadContributors();
            this.renderContributors();
            this.updateStats();
        } catch (error) {
            this.showError(error);
        }
    }

    getCachedData() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < this.cacheExpiry) {
                    return data;
                }
                localStorage.removeItem(this.cacheKey);
            }
        } catch (error) {
            console.warn('Cache read error:', error);
        }
        return null;
    }

    setCachedData(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Cache write error:', error);
        }
    }

    clearCache() {
        localStorage.removeItem(this.cacheKey);
        console.log('Cache cleared successfully');
    }

    async forceRefresh() {
        this.clearCache();
        const loadingElement = document.getElementById('loadingState');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        // Remove existing warnings
        const warnings = document.querySelectorAll('.api-warning');
        warnings.forEach(warning => warning.remove());
        
        await this.loadContributors();
    }

    updateLoadingStatus(message) {
        const statusElement = document.getElementById('loadingStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log(message);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadContributors() {
        const loadingElement = document.getElementById('loadingState');
        
        this.updateLoadingStatus('Connecting to GitHub API...');

        try {
            // Try to fetch from GitHub
            await this.fetchFromGitHub();
            if (loadingElement) loadingElement.style.display = 'none';
            console.log(`✅ Loaded ${this.contributors.length} contributors from GitHub`);
        } catch (error) {
            console.error('GitHub API failed:', error);
            
            // Try cache
            const cachedData = this.getCachedData();
            if (cachedData && cachedData.contributors?.length > 0) {
                this.contributors = cachedData.contributors;
                this.repoData = cachedData.repoData;
                if (loadingElement) loadingElement.style.display = 'none';
                this.showApiWarning('Using cached data - GitHub API temporarily unavailable');
                this.renderContributors();
                this.updateStats();
                return;
            }
            
            // Use fallback data
            if (loadingElement) loadingElement.style.display = 'none';
            this.loadFallbackData();
        }
    }

    async fetchFromGitHub() {
        // Step 1: Get repository info
        this.updateLoadingStatus('Fetching repository information...');
        const repoData = await this.fetchRepository();
        this.repoData = repoData;

        // Step 2: Get contributors
        this.updateLoadingStatus('Fetching contributors...');
        const contributors = await this.fetchContributors();

        // Step 3: Enhance with user details
        this.updateLoadingStatus('Getting user details...');
        const enhancedContributors = await this.enhanceContributors(contributors);

        // Sort and cache
        this.contributors = enhancedContributors.sort((a, b) => b.contributions - a.contributions);
        
        this.setCachedData({
            contributors: this.contributors,
            repoData: this.repoData
        });

        console.log('✅ GitHub data fetched successfully');
    }

    async makeRequest(url, timeout = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'WebDevIn100Days-Contributors/1.0'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    async fetchRepository() {
        const url = `${this.githubConfig.apiUrl}/repos/${this.githubConfig.owner}/${this.githubConfig.repo}`;
        const response = await this.makeRequest(url);
        
        if (!response.ok) {
            throw new Error(`Repository fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            stargazers_count: data.stargazers_count || 0,
            forks_count: data.forks_count || 0,
            name: data.name || this.githubConfig.repo,
            description: data.description || 'Web development learning repository'
        };
    }

    async fetchContributors() {
        const baseUrl = `${this.githubConfig.apiUrl}/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contributors`;
        let allContributors = [];
        let page = 1;
        const maxPages = 3;
        
        while (page <= maxPages) {
            const url = `${baseUrl}?per_page=50&page=${page}`;
            this.updateLoadingStatus(`Fetching contributors page ${page}...`);
            
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                if (response.status === 404 && page === 1) {
                    throw new Error('Contributors not found');
                }
                break;
            }
            
            const contributors = await response.json();
            
            if (!contributors || contributors.length === 0) {
                break;
            }
            
            allContributors.push(...contributors);
            page++;
            
            if (page <= maxPages) {
                await this.delay(500);
            }
        }
        
        if (allContributors.length === 0) {
            throw new Error('No contributors found');
        }
        
        return allContributors;
    }

    async enhanceContributors(contributors) {
        const enhanced = [];
        
        for (let i = 0; i < contributors.length; i++) {
            const contributor = contributors[i];
            this.updateLoadingStatus(`Getting details for ${contributor.login} (${i + 1}/${contributors.length})...`);
            
            try {
                const response = await this.makeRequest(contributor.url);
                
                if (response.ok) {
                    const userData = await response.json();
                    enhanced.push({
                        ...contributor,
                        name: userData.name || contributor.login,
                        bio: userData.bio || null,
                        location: userData.location || null,
                        company: userData.company || null,
                        public_repos: userData.public_repos || 0,
                        followers: userData.followers || 0,
                        created_at: userData.created_at || '2020-01-01T00:00:00Z'
                    });
                } else {
                    enhanced.push({
                        ...contributor,
                        name: contributor.login,
                        bio: null,
                        location: null,
                        company: null,
                        public_repos: 0,
                        followers: 0,
                        created_at: '2020-01-01T00:00:00Z'
                    });
                }
                
                // Small delay between requests
                await this.delay(300);
                
            } catch (error) {
                console.warn(`Failed to fetch details for ${contributor.login}:`, error.message);
                enhanced.push({
                    ...contributor,
                    name: contributor.login,
                    bio: null,
                    location: null,
                    company: null,
                    public_repos: 0,
                    followers: 0,
                    created_at: '2020-01-01T00:00:00Z'
                });
            }
        }
        
        return enhanced;
    }

    loadFallbackData() {
        this.contributors = [
            {
                login: 'ruchikakengal',
                name: 'Ruchika Kengal',
                avatar_url: 'https://avatars.githubusercontent.com/u/ruchikakengal?v=4',
                html_url: 'https://github.com/ruchikakengal',
                contributions: 95,
                followers: 280,
                public_repos: 42,
                bio: 'Project Owner & Full Stack Developer',
                location: 'India',
                company: 'WebDev Community',
                created_at: '2020-01-01T00:00:00Z'
            },
            {
                login: 'kauntiaakash2',
                name: 'Akash Kauntia',
                avatar_url: 'https://avatars.githubusercontent.com/u/kauntiaakash2?v=4',
                html_url: 'https://github.com/kauntiaakash2',
                contributions: 35,
                followers: 120,
                public_repos: 28,
                bio: 'Contributor & Full Stack Developer',
                location: 'India',
                company: 'Tech Enthusiast',
                created_at: '2021-03-15T00:00:00Z'
            }
        ];

        this.repoData = {
            stargazers_count: 287,
            forks_count: 145,
            name: 'WebDevIn100_Days',
            description: 'A comprehensive collection of 100 web development projects'
        };

        this.renderContributors();
        this.updateStats();
        this.showApiWarning('GitHub API is temporarily unavailable. Showing sample data.');
    }

    showApiWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'api-warning';
        warningDiv.style.cssText = `
            background: #fff3cd;
            border: 2px solid #f39c12;
            color: #856404;
            padding: 15px;
            margin: 15px auto;
            border-radius: 8px;
            text-align: center;
            max-width: 800px;
        `;
        
        warningDiv.innerHTML = `
            <strong>⚠️ API Notice</strong><br>
            ${message}<br>
            <button onclick="window.contributorsManager?.forceRefresh()" style="
                margin-top: 10px;
                padding: 8px 16px; 
                background: #e74c3c; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer;
            ">🔄 Force Refresh</button>
        `;
        
        const container = document.querySelector('.contributors-section') || document.body;
        container.insertBefore(warningDiv, container.firstChild);
    }

    renderContributors() {
        const grid = document.getElementById('contributorsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';

        this.contributors.forEach((contributor, index) => {
            const card = this.createContributorCard(contributor, index);
            grid.appendChild(card);
        });
    }

    createContributorCard(contributor, index) {
        const card = document.createElement('div');
        card.className = 'contributor-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const joinDate = contributor.created_at ? 
            new Date(contributor.created_at).toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'long'
            }) : 'Unknown';

        card.innerHTML = `
            <div class="avatar-container">
                <img src="${contributor.avatar_url}" alt="${contributor.name || contributor.login}" class="contributor-avatar">
            </div>
            
            <div class="contributor-name">${contributor.name || contributor.login}</div>
            <div class="contributor-username">@${contributor.login}</div>
            
            ${contributor.bio ? `<p style="color: #b0bec5; font-size: 0.9rem; margin: 1rem 0; line-height: 1.4;">${contributor.bio}</p>` : ''}
            
            <div class="contributor-stats">
                <div class="contributor-stat">
                    <div class="stat-value">${contributor.contributions}</div>
                    <div class="stat-name">Commits</div>
                </div>
                <div class="contributor-stat">
                    <div class="stat-value">${this.formatNumber(contributor.followers || 0)}</div>
                    <div class="stat-name">Followers</div>
                </div>
                <div class="contributor-stat">
                    <div class="stat-value">${contributor.public_repos || 0}</div>
                    <div class="stat-name">Repos</div>
                </div>
            </div>
            
            ${contributor.location ? `<p style="color: #64ffda; font-size: 0.85rem; margin: 0.5rem 0;"><i class="fas fa-map-marker-alt"></i> ${contributor.location}</p>` : ''}
            ${contributor.company ? `<p style="color: #64ffda; font-size: 0.85rem; margin: 0.5rem 0;"><i class="fas fa-building"></i> ${contributor.company}</p>` : ''}
            <p style="color: #b0bec5; font-size: 0.85rem; margin: 0.5rem 0;"><i class="fas fa-calendar-alt"></i> Joined ${joinDate}</p>
            
            <div class="contributor-actions">
                <a href="${contributor.html_url}" target="_blank" class="action-btn github-btn">
                    <i class="fab fa-github"></i> GITHUB
                </a>
                <button onclick="generateCertificate('${contributor.login}', '${(contributor.name || contributor.login).replace(/'/g, "\\'")}', ${contributor.contributions})" class="action-btn certificate-btn">
                    <i class="fas fa-certificate"></i> Certificate
                </button>
            </div>
        `;

        return card;
    }

    updateStats() {
        if (!this.repoData || !this.contributors.length) return;

        const totalCommits = this.contributors.reduce((sum, contributor) => 
            sum + (contributor.contributions || 0), 0);

        this.animateNumber('totalContributors', this.contributors.length);
        this.animateNumber('totalCommits', totalCommits);
        this.animateNumber('totalStars', this.repoData.stargazers_count || 0);
        this.animateNumber('totalForks', this.repoData.forks_count || 0);
    }

    animateNumber(elementId, targetNumber) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 2000;
        const startTime = Date.now();

        const updateNumber = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const currentNumber = Math.floor(targetNumber * progress);
            
            element.textContent = this.formatNumber(currentNumber);
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = this.formatNumber(targetNumber);
            }
        };

        updateNumber();
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    showError(error) {
        console.error('Error loading contributors:', error);
        
        const grid = document.getElementById('contributorsGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Unable to Load Contributors</h3>
                <p>The GitHub API is currently unavailable.</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 1rem; 
                    padding: 12px 24px; 
                    background: #1abc9c; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer;
                ">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Certificate Generation
function generateCertificate(username, fullName, contributions) {
    const modal = document.getElementById('certificateModal');
    const canvas = document.getElementById('certificateCanvas');
    
    if (!modal || !canvas) {
        console.error('Certificate modal or canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    modal.style.display = 'block';
    
    // Canvas setup
    canvas.width = 900;
    canvas.height = 700;
    
    // Background gradient
    const gradient = ctx.createRadialGradient(450, 350, 100, 450, 350, 500);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#e8f8f5');
    gradient.addColorStop(1, '#d5f5e3');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Inner border
    ctx.strokeStyle = '#16a085';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.setLineDash([]);
    
    // Title
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE', canvas.width / 2, 120);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('OF COMPLETION', canvas.width / 2, 150);
    
    // Content
    ctx.fillStyle = '#444';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('This is to certify that', canvas.width / 2, 220);
    
    // Name
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText(fullName, canvas.width / 2, 270);
    
    ctx.fillStyle = '#16a085';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText(`@${username}`, canvas.width / 2, 295);
    
    // Description
    ctx.fillStyle = '#444';
    ctx.font = '16px Georgia, serif';
    const lines = [
        'has successfully contributed to the WebDevIn100_Days project',
        'demonstrating commitment to web development learning',
        `with ${contributions} contribution${contributions !== 1 ? 's' : ''} to the repository`
    ];
    
    let y = 340;
    lines.forEach(line => {
        ctx.fillText(line, canvas.width / 2, y);
        y += 25;
    });
    
    // Project name
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('WebDevIn100_Days', canvas.width / 2, y + 30);
    
    // Date
    ctx.fillStyle = '#666';
    ctx.font = '14px Georgia, serif';
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    ctx.fillText(`Issued on ${currentDate}`, canvas.width / 2, y + 70);
    
    // Signatures
    const sigY = y + 130;
    
    // Left signature
    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, sigY);
    ctx.lineTo(300, sigY);
    ctx.stroke();
    
    ctx.fillStyle = '#666';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('Project Maintainer', 225, sigY + 18);
    ctx.font = '10px Georgia, serif';
    ctx.fillText('Ruchika Kengal', 225, sigY + 32);
    
    // Right signature
    ctx.beginPath();
    ctx.moveTo(600, sigY);
    ctx.lineTo(750, sigY);
    ctx.stroke();
    
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('Community Lead', 675, sigY + 18);
    ctx.font = '10px Georgia, serif';
    ctx.fillText('WebDev100_Days Team', 675, sigY + 32);
}

function downloadCertificate() {
    const canvas = document.getElementById('certificateCanvas');
    const link = document.createElement('a');
    link.download = 'webdevin100days-certificate.png';
    link.href = canvas.toDataURL();
    link.click();
}

function closeCertificateModal() {
    document.getElementById('certificateModal').style.display = 'none';
}

// Modal close on outside click
window.onclick = function(event) {
    const modal = document.getElementById('certificateModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.contributorsManager = new ContributorsManager();
});

// Global refresh function
window.forceRefreshContributors = async () => {
    if (window.contributorsManager) {
        await window.contributorsManager.forceRefresh();
    } else {
        location.reload();
    }
};
