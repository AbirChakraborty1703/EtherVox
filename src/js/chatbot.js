/**
 * EtherVox AI Chatbot - Voice & Text Navigation Assistant
 */

class EtherVoxChatbot {
  constructor() {
    this.isOpen = false;
    this.isListening = false;
    this.recognition = null;
    this.currentPage = this.detectCurrentPage();
    
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
      'candidate': '/AddCandidate.html'
    };

    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('login') || path === '/') return 'login';
    if (path.includes('SetVote')) return 'set vote';
    if (path.includes('AdminDashboard')) return 'admin dashboard';
    if (path.includes('AddCandidate')) return 'add candidate';
    if (path.includes('index')) return 'voting';
    return 'unknown';
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
        <button class="chatbot-toggle" id="chatbotToggle" title="Open EtherVox Assistant">
          <i class="fas fa-comments"></i>
        </button>
        <div class="chatbot-window" id="chatbotWindow">
          <div class="chatbot-header">
            <div class="chatbot-header-title">
              <i class="fas fa-robot"></i>
              <div>
                <h3>EtherVox Assistant</h3>
                <div class="chatbot-status"><span class="status-dot"></span><span>Online</span></div>
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
            <button class="quick-action-btn" data-action="help"><i class="fas fa-question-circle"></i> Help</button>
            <button class="quick-action-btn" data-action="pages"><i class="fas fa-list"></i> Pages</button>
            <button class="quick-action-btn" data-action="status"><i class="fas fa-info-circle"></i> Status</button>
          </div>
          <div class="chatbot-input-area">
            <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Type or speak..." autocomplete="off"/>
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
    document.getElementById('chatbotClose').addEventListener('click', () => this.toggleChatbot());
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
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
      this.addBotMessage('Voice not supported. Use Chrome or Edge browser.');
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
    voiceBtn.classList.remove('listening');
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
  }

  toggleChatbot() {
    this.isOpen = !this.isOpen;
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.toggle('active', this.isOpen);
    if (!this.isOpen && this.isListening) {
      this.recognition.stop();
    }
  }

  showWelcomeMessage() {
    setTimeout(() => {
      this.addBotMessage(`👋 <b>Welcome to EtherVox Assistant!</b><br><br>
        I can help you navigate:<br>
        • 🏠 Voting Page<br>
        • 🔐 Login Page<br>
        • ⚙️ Set Vote Page<br>
        • 📊 Admin Dashboard<br>
        • ➕ Add Candidate<br><br>
        Try: "Go to login" or click 🎤 to speak!`);
    }, 500);
  }

  sendMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    if (!message) return;

    this.addUserMessage(message);
    input.value = '';
    this.showTypingIndicator();

    setTimeout(() => {
      this.processMessage(message);
      this.hideTypingIndicator();
    }, 600);
  }

  processMessage(message) {
    const lower = message.toLowerCase();

    // Navigation
    if (this.isNavigationCommand(lower)) {
      this.handleNavigation(lower);
      return;
    }

    // Help
    if (lower.includes('help')) {
      this.showHelp();
      return;
    }

    // Show pages
    if (lower.includes('pages') || lower.includes('list')) {
      this.showPageList();
      return;
    }

    // Current page
    if (lower.includes('where') || lower.includes('current')) {
      this.addBotMessage(`You are on the <b>${this.currentPage}</b> page.`);
      return;
    }

    // Greetings
    if (lower.match(/^(hi|hello|hey)/)) {
      this.addBotMessage('Hello! 👋 How can I help you navigate?');
      return;
    }

    // Thanks
    if (lower.includes('thank')) {
      this.addBotMessage('You\'re welcome! 😊');
      return;
    }

    // Default
    this.addBotMessage(`I can help you navigate. Try:<br>• "Go to login"<br>• "Show pages"<br>• "Help"`);
  }

  isNavigationCommand(message) {
    const navKeywords = ['go to', 'open', 'show', 'navigate', 'take me'];
    return navKeywords.some(k => message.includes(k)) || 
           Object.keys(this.pages).some(p => message.includes(p));
  }

  handleNavigation(message) {
    let targetPage = null, pageName = null;

    for (const [key, value] of Object.entries(this.pages)) {
      if (message.includes(key)) {
        targetPage = value;
        pageName = key;
        break;
      }
    }

    if (targetPage) {
      // Get current token from URL if exists
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('Authorization');
      
      let url = targetPage;
      if (token && !targetPage.includes('login')) {
        url += '?Authorization=' + encodeURIComponent(token);
      }

      this.addBotMessage(`Navigating to ${pageName}... 🚀`);
      setTimeout(() => { window.location.href = url; }, 800);
    } else {
      this.addBotMessage('Page not found. Type "pages" to see available pages.');
    }
  }

  showHelp() {
    this.addBotMessage(`<b>🤖 EtherVox Assistant Help</b><br><br>
      <b>Navigation:</b><br>
      • "Go to login"<br>
      • "Open voting page"<br>
      • "Show admin dashboard"<br>
      • "Take me to add candidate"<br><br>
      <b>Commands:</b><br>
      • "Show pages" - List pages<br>
      • "Where am I?" - Current page<br>
      • "Help" - This message<br><br>
      💡 Use 🎤 for voice input!`);
  }

  showPageList() {
    this.addBotMessage(`<b>📄 Available Pages:</b><br><br>
      1️⃣ <b>Login</b> - Authentication<br>
      2️⃣ <b>Voting</b> - Cast your vote<br>
      3️⃣ <b>Set Vote</b> - Configure dates<br>
      4️⃣ <b>Admin Dashboard</b> - Admin panel<br>
      5️⃣ <b>Add Candidate</b> - Add candidates<br><br>
      Say "Go to [page name]" to navigate!`);
  }

  handleQuickAction(action) {
    switch (action) {
      case 'help':
        this.addUserMessage('Help');
        setTimeout(() => this.showHelp(), 400);
        break;
      case 'pages':
        this.addUserMessage('Show pages');
        setTimeout(() => this.showPageList(), 400);
        break;
      case 'status':
        this.addUserMessage('Status');
        setTimeout(() => {
          this.addBotMessage(`<b>📊 Status</b><br>
            • Page: ${this.currentPage}<br>
            • Voice: ${this.recognition ? '✅ Ready' : '❌ N/A'}<br>
            • Status: 🟢 Online`);
        }, 400);
        break;
    }
  }

  addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.textContent = text;
    const container = document.getElementById('chatbotMessages');
    container.insertBefore(msg, document.getElementById('typingIndicator'));
    this.scrollToBottom();
  }

  addBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.innerHTML = html;
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
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EtherVoxChatbot());
} else {
  new EtherVoxChatbot();
}
