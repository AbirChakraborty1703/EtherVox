/**
 * EtherVox AI Chatbot — Professional AI-Powered Assistant
 * Connects to the Python FastAPI chatbot engine for intelligent responses.
 * Features: streaming text, voice input, navigation, markdown rendering
 */

class EtherVoxChatbot {
  constructor() {
    this.isOpen = false;
    this.isListening = false;
    this.isSending = false;
    this.recognition = null;
    this.currentPage = this.detectCurrentPage();
    this.API_URL = 'http://127.0.0.1:8001/chatbot/ask';
    this.messageHistory = [];

    // Navigation map
    this.pages = {
      'login': '/login.html',
      'home': '/index.html',
      'index': '/index.html',
      'voting': '/index.html',
      'vote': '/index.html',
      'set vote': '/SetVote.html',
      'setvote': '/SetVote.html',
      'admin dashboard': '/AdminDashboard.html',
      'dashboard': '/AdminDashboard.html',
      'admin': '/AdminDashboard.html',
      'add candidate': '/AddCandidate.html',
      'addcandidate': '/AddCandidate.html',
      'candidate': '/Candidate.html',
      'result': '/result.html',
      'results': '/result.html',
      'face register': '/face-register.html',
      'face id': '/face-register.html',
      'liveness': '/liveness-check.html'
    };

    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('login') || path === '/') return 'Login';
    if (path.includes('SetVote')) return 'Set Vote';
    if (path.includes('AdminDashboard')) return 'Admin Dashboard';
    if (path.includes('AddCandidate')) return 'Add Candidate';
    if (path.includes('Candidate')) return 'Candidate Profile';
    if (path.includes('result')) return 'Results';
    if (path.includes('index')) return 'Voting';
    if (path.includes('face-register')) return 'Face Register';
    if (path.includes('liveness')) return 'Liveness Check';
    return 'Unknown';
  }

  init() {
    this.createChatbotHTML();
    this.attachEventListeners();
    this.initVoiceRecognition();
    this.showWelcomeMessage();
  }

  createChatbotHTML() {
    const chatbotHTML = `
      <div class="chatbot-container">
        <button class="chatbot-toggle" id="chatbotToggle" title="EtherVox AI Assistant">
          <i class="fas fa-robot"></i>
        </button>
        <div class="chatbot-window" id="chatbotWindow">
          <div class="chatbot-header">
            <div class="chatbot-header-title">
              <div class="ai-avatar">🤖</div>
              <div>
                <h3>EtherVox AI</h3>
                <div class="chatbot-status"><span class="status-dot"></span><span>AI Online</span></div>
              </div>
            </div>
            <button class="chatbot-close" id="chatbotClose"><i class="fas fa-times"></i></button>
          </div>
          <div class="chatbot-messages" id="chatbotMessages">
            <div class="typing-indicator" id="typingIndicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
          <div class="quick-actions">
            <button class="quick-action-btn" data-action="how-to-vote">🗳️ How to Vote</button>
            <button class="quick-action-btn" data-action="about">ℹ️ About</button>
            <button class="quick-action-btn" data-action="security">🔒 Security</button>
            <button class="quick-action-btn" data-action="help">💡 Help</button>
            <button class="quick-action-btn" data-action="pages">📄 Pages</button>
          </div>
          <div class="chatbot-input-area">
            <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Ask me anything about EtherVox..." autocomplete="off"/>
            <button class="input-btn voice-btn" id="voiceBtn" title="Voice Input"><i class="fas fa-microphone"></i></button>
            <button class="input-btn send-btn" id="sendBtn"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    document.getElementById('chatbotToggle').addEventListener('click', () => this.toggleChatbot());
    document.getElementById('chatbotClose').addEventListener('click', () => this.closeChatbot());
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isSending) this.sendMessage();
    });
    document.getElementById('voiceBtn').addEventListener('click', () => this.toggleVoiceRecognition());
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleQuickAction(e.currentTarget.getAttribute('data-action')));
    });
  }

  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatbotInput').value = transcript;
        this.sendMessage();
      };
      this.recognition.onerror = () => this.stopListening();
      this.recognition.onend = () => this.stopListening();
    }
  }

  toggleVoiceRecognition() {
    if (!this.recognition) {
      this.addBotMessage('🎙️ Voice input requires Chrome or Edge browser.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.startListening();
    }
  }

  startListening() {
    this.isListening = true;
    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn.classList.add('listening');
    voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
    try {
      this.recognition.start();
      this.addBotMessage('🎤 Listening... Speak now!');
    } catch (e) {
      this.stopListening();
    }
  }

  stopListening() {
    this.isListening = false;
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      voiceBtn.classList.remove('listening');
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
  }

  toggleChatbot() {
    if (this.isOpen) {
      this.closeChatbot();
    } else {
      this.openChatbot();
    }
  }

  openChatbot() {
    this.isOpen = true;
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.remove('closing');
    chatbotWindow.classList.add('active');
    // Focus input
    setTimeout(() => document.getElementById('chatbotInput')?.focus(), 400);
  }

  closeChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.add('closing');
    if (this.isListening && this.recognition) this.recognition.stop();
    setTimeout(() => {
      chatbotWindow.classList.remove('active', 'closing');
      this.isOpen = false;
    }, 280);
  }

  showWelcomeMessage() {
    setTimeout(() => {
      this.addBotMessage(
        `👋 <b>Welcome to EtherVox AI!</b><br><br>` +
        `I'm your intelligent assistant for the EtherVox Decentralized Voting System. ` +
        `I know everything about how the system works!<br><br>` +
        `<b>Ask me about:</b><br>` +
        `• 🗳️ How voting works<br>` +
        `• 🔐 Security features<br>` +
        `• ⛓️ Blockchain technology<br>` +
        `• 👥 User roles & login<br>` +
        `• 📊 Election results<br>` +
        `• 🧭 Page navigation<br><br>` +
        `<i>Try: "How do I vote?" or "Who created EtherVox?"</i>`
      );
    }, 600);
  }

  async sendMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    if (!message || this.isSending) return;

    this.isSending = true;
    this.addUserMessage(message);
    input.value = '';
    this.messageHistory.push({ role: 'user', content: message });

    // Check for navigation commands first (client-side)
    const lower = message.toLowerCase();
    if (this.isNavigationCommand(lower)) {
      this.handleNavigation(lower);
      this.isSending = false;
      return;
    }

    // Check current page query
    if (lower.includes('where am i') || (lower.includes('where') && lower.includes('current'))) {
      this.showTypingIndicator();
      await this._delay(400);
      this.hideTypingIndicator();
      this.addBotMessage(`📍 You are currently on the <b>${this.currentPage}</b> page.`);
      this.isSending = false;
      return;
    }

    // AI backend query
    this.showTypingIndicator();
    try {
      const response = await this.queryAI(message);
      this.hideTypingIndicator();
      const formattedAnswer = this.formatMarkdown(response.answer);
      await this.streamBotMessage(formattedAnswer);
      this.messageHistory.push({ role: 'bot', content: response.answer });
    } catch (err) {
      this.hideTypingIndicator();
      // Fallback: use client-side processing if backend is down
      const fallbackResponse = this.localFallback(message);
      this.addBotMessage(fallbackResponse);
    }
    this.isSending = false;
  }

  async queryAI(message) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Simulate streaming text — renders HTML character-by-character for a ChatGPT-like feel
   */
  async streamBotMessage(html) {
    const container = document.getElementById('chatbotMessages');
    const msg = document.createElement('div');
    msg.className = 'message bot';
    container.insertBefore(msg, document.getElementById('typingIndicator'));

    // Parse HTML into safe chunks: split on tags vs text
    const chunks = html.match(/(<[^>]+>|[^<]+)/g) || [html];
    let currentHTML = '';

    for (const chunk of chunks) {
      if (chunk.startsWith('<')) {
        // It's an HTML tag — insert immediately
        currentHTML += chunk;
        msg.innerHTML = currentHTML;
      } else {
        // It's text — stream character by character
        for (let i = 0; i < chunk.length; i++) {
          currentHTML += chunk[i];
          msg.innerHTML = currentHTML;
          // Speed: 8ms per char (~125 chars/sec) — fast but visible
          if (i % 3 === 0) {
            await this._delay(6);
            this.scrollToBottom();
          }
        }
      }
    }
    this.scrollToBottom();
  }

  /**
   * Convert markdown-ish text to HTML
   * Handles: **bold**, `code`, \n→br, bullet points (•)
   */
  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')            // **bold**
      .replace(/`([^`]+)`/g, '<code>$1</code>')           // `code`
      .replace(/\n/g, '<br>')                               // newlines
      .replace(/^• /gm, '&bull; ');                         // bullet points
    return html;
  }

  /**
   * Client-side fallback when the AI backend is unreachable
   */
  localFallback(message) {
    const lower = message.toLowerCase();
    if (lower.match(/^(hi|hello|hey|good)/)) {
      return '👋 Hello! I\'m the EtherVox AI Assistant. How can I help you?';
    }
    if (lower.includes('help')) {
      return '<b>💡 I can help with:</b><br>• "How do I vote?"<br>• "What is EtherVox?"<br>• "Go to results"<br>• "Who created this?"<br>• "Security features"<br><br>🎤 Or use voice input!';
    }
    if (lower.includes('thank')) {
      return '😊 You\'re welcome! Ask me anything else!';
    }
    return '⚡ The AI backend is currently waking up. Meanwhile, I can help you navigate — try <b>"Go to voting"</b> or <b>"Show pages"</b>.';
  }

  isNavigationCommand(message) {
    const navKeywords = ['go to', 'open', 'navigate to', 'take me to', 'bring me'];
    return navKeywords.some(k => message.includes(k));
  }

  handleNavigation(message) {
    let targetPage = null, pageName = null;

    for (const [key, value] of Object.entries(this.pages)) {
      if (message.includes(key)) {
        targetPage = value;
        pageName = key.charAt(0).toUpperCase() + key.slice(1);
        break;
      }
    }

    if (targetPage) {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('Authorization');
      let url = targetPage;
      if (token && !targetPage.includes('login')) {
        url += '?Authorization=' + encodeURIComponent(token);
      }

      this.addBotMessage(`🚀 Navigating to <b>${pageName}</b>...`);
      setTimeout(() => { window.location.href = url; }, 800);
    } else {
      this.addBotMessage('🔍 Page not found. Try: <b>"Go to voting"</b>, <b>"Go to results"</b>, or <b>"Go to login"</b>.');
    }
  }

  handleQuickAction(action) {
    const actionMessages = {
      'how-to-vote': 'How do I vote?',
      'about': 'What is EtherVox?',
      'security': 'What security features does EtherVox have?',
      'help': 'Help',
      'pages': 'What pages are available?'
    };
    const message = actionMessages[action] || action;
    document.getElementById('chatbotInput').value = message;
    this.sendMessage();
  }

  addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.textContent = text;
    // Timestamp
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(time);
    const container = document.getElementById('chatbotMessages');
    container.insertBefore(msg, document.getElementById('typingIndicator'));
    this.scrollToBottom();
  }

  addBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.innerHTML = html;
    // Timestamp
    const time = document.createElement('span');
    time.className = 'message-time';
    time.style.color = 'rgba(255,255,255,0.55)';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(time);
    const container = document.getElementById('chatbotMessages');
    container.insertBefore(msg, document.getElementById('typingIndicator'));
    this.scrollToBottom();
  }

  showTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('active');
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('active');
  }

  scrollToBottom() {
    const container = document.getElementById('chatbotMessages');
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EtherVoxChatbot());
} else {
  new EtherVoxChatbot();
}
