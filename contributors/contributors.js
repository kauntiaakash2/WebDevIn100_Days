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
        this.cacheKey = 'contributors_cache_v2';
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

    async loadContributors() {
        const loadingElement = document.getElementById('loadingState');
        
        // Check cache first
        const cachedData = this.getCachedData();
        if (cachedData) {
            this.contributors = cachedData.contributors;
            this.repoData = cachedData.repoData;
            loadingElement.style.display = 'none';
            return;
        }

        try {
            // Fetch repository data
            const repoResponse = await fetch(`${this.githubConfig.apiUrl}/repos/${this.githubConfig.owner}/${this.githubConfig.repo}`);
            if (!repoResponse.ok) throw new Error(`Repository API error: ${repoResponse.status}`);
            this.repoData = await repoResponse.json();

            // Fetch contributors with pagination
            let allContributors = [];
            let page = 1;
            const perPage = 100;

            while (true) {
                const contributorsResponse = await fetch(
                    `${this.githubConfig.apiUrl}/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contributors?per_page=${perPage}&page=${page}`
                );
                
                if (!contributorsResponse.ok) throw new Error(`Contributors API error: ${contributorsResponse.status}`);
                const contributors = await contributorsResponse.json();
                
                if (contributors.length === 0) break;
                allContributors = allContributors.concat(contributors);
                page++;
            }

            // Fetch detailed user info for each contributor
            const contributorsWithDetails = await Promise.all(
                allContributors.map(async (contributor) => {
                    try {
                        const userResponse = await fetch(contributor.url);
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            return {
                                ...contributor,
                                name: userData.name || contributor.login,
                                bio: userData.bio,
                                location: userData.location,
                                blog: userData.blog,
                                company: userData.company,
                                public_repos: userData.public_repos,
                                followers: userData.followers,
                                following: userData.following,
                                created_at: userData.created_at,
                                twitter_username: userData.twitter_username
                            };
                        }
                        return contributor;
                    } catch (error) {
                        console.warn(`Failed to fetch details for ${contributor.login}:`, error);
                        return contributor;
                    }
                })
            );

            this.contributors = contributorsWithDetails.sort((a, b) => b.contributions - a.contributions);
            
            // Cache the data
            this.setCachedData({
                contributors: this.contributors,
                repoData: this.repoData
            });

            loadingElement.style.display = 'none';
        } catch (error) {
            loadingElement.style.display = 'none';
            throw error;
        }
    }

    renderContributors() {
        const grid = document.getElementById('contributorsGrid');
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

        const blogLink = contributor.blog && contributor.blog.startsWith('http') ? 
            contributor.blog : 
            contributor.blog ? `https://${contributor.blog}` : null;

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
                    <i class="fab fa-github"></i>
                    GITHUB
                </a>
                <button onclick="generateCertificate('${contributor.login}', '${contributor.name || contributor.login}', ${contributor.contributions})" class="action-btn certificate-btn">
                    <i class="fas fa-certificate"></i>
                    Certificate
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

        const startNumber = 0;
        const duration = 2000;
        const startTime = Date.now();

        const updateNumber = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * easeOutCubic);
            
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
        grid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Failed to Load Contributors</h3>
                <p>${error.message}</p>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()" class="action-btn certificate-btn" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Certificate Generation Functions
function generateCertificate(username, fullName, contributions) {
    const modal = document.getElementById('certificateModal');
    const canvas = document.getElementById('certificateCanvas');
    const ctx = canvas.getContext('2d');
    
    modal.style.display = 'block';
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(0.5, '#e8f8f5');
    gradient.addColorStop(1, '#ffffff');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Add inner border
    ctx.strokeStyle = '#16a085';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    
    // Add title
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE', canvas.width / 2, 120);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('OF CONTRIBUTION', canvas.width / 2, 155);
    
    // Add decorative line
    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, 180);
    ctx.lineTo(600, 180);
    ctx.stroke();
    
    // Add recipient text
    ctx.fillStyle = '#666';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('This is to certify that', canvas.width / 2, 230);
    
    // Add recipient name
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(fullName, canvas.width / 2, 280);
    
    // Add username
    ctx.fillStyle = '#16a085';
    ctx.font = 'italic 18px Arial, sans-serif';
    ctx.fillText(`@${username}`, canvas.width / 2, 310);
    
    // Add contribution text
    ctx.fillStyle = '#333';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('has successfully contributed to', canvas.width / 2, 360);
    
    // Add project name
    ctx.fillStyle = '#1abc9c';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('WebDev100_Days', canvas.width / 2, 395);
    
    // Add contribution count
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`with ${contributions} commit${contributions !== 1 ? 's' : ''}`, canvas.width / 2, 425);
    
    // Add date
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial, sans-serif';
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    ctx.fillText(`Issued on ${currentDate}`, canvas.width / 2, 480);
    
    // Add signature line
    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(500, 530);
    ctx.lineTo(650, 530);
    ctx.stroke();
    
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('WebDev100_Days Team', 575, 545);
    
    // Add decorative elements
    drawStar(ctx, 100, 100, 5, 20, 10, '#1abc9c');
    drawStar(ctx, 700, 100, 5, 20, 10, '#16a085');
    drawStar(ctx, 100, 500, 5, 15, 8, '#1abc9c');
    drawStar(ctx, 700, 500, 5, 15, 8, '#16a085');
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function downloadCertificate() {
    const canvas = document.getElementById('certificateCanvas');
    const link = document.createElement('a');
    link.download = 'webdev100days-certificate.png';
    link.href = canvas.toDataURL();
    link.click();
}

function closeCertificateModal() {
    document.getElementById('certificateModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('certificateModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize the contributors manager
document.addEventListener('DOMContentLoaded', () => {
    new ContributorsManager();
});
