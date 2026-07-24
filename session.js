// Session Management
class SessionManager {
    constructor() {
        this.sessionId = this.getOrCreateSession();
        this.initializeSessionUI();
    }

    getOrCreateSession() {
        const storedSession = localStorage.getItem('ipo_session_id');
        
        if (storedSession) {
            return storedSession;
        }

        // Generate new session ID
        const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('ipo_session_id', newSessionId);
        return newSessionId;
    }

    initializeSessionUI() {
        const sessionBadge = document.getElementById('sessionId');
        if (sessionBadge) {
            sessionBadge.textContent = `Session: ${this.sessionId.substr(0, 20)}...`;
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout? Your session data will be cleared.')) {
            localStorage.removeItem('ipo_session_id');
            localStorage.removeItem('ipo_portfolio');
            localStorage.removeItem('ipo_transactions');
            location.reload();
        }
    }
}

// Initialize session manager
const sessionManager = new SessionManager();

// Setup logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => sessionManager.logout());
    }
});