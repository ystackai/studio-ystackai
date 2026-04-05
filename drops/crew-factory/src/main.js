// Main JavaScript for Crew Factory Application
class CrewFactoryApp {
  constructor() {
    this.state = {
      crews: [],
      briefs: [],
      discordConnected: false,
      currentUser: null
    };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadInitialState();
    this.render();
  }
  
  setupEventListeners() {
    // Discord connect button
    const discordConnectBtn = document.getElementById('discord-connect');
    if (discordConnectBtn) {
      discordConnectBtn.addEventListener('click', () => this.connectDiscord());
    }
    
    // Brief form submission
    const briefForm = document.getElementById('brief-form');
    if (briefForm) {
      briefForm.addEventListener('submit', (e) => this.createBrief(e));
    }
    
    // Navigation
    const navLinks = document.querySelectorAll('.app-header nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('href');
        this.scrollToSection(target);
      });
    });
  }
  
  loadInitialState() {
    // Load from localStorage or set defaults
    const savedState = localStorage.getItem('crewFactoryState');
    if (savedState) {
      this.state = JSON.parse(savedState);
    } else {
      // Initialize with sample data
      this.state.crews = [
        {
          id: 1,
          name: 'AI Research Crew',
          description: 'Research team focused on advanced AI models and applications.',
          members: ['Derek', 'Wei', 'Schneider'],
          projects: 3
        },
        {
          id: 2,
          name: 'Game Development Crew',
          description: 'Creating immersive gaming experiences with cutting-edge technology.',
          members: ['JB', 'Brad', 'Megan'],
          projects: 2
        }
      ];
      
      this.state.briefs = [
        {
          id: 1,
          title: 'New AI Model Research',
          description: 'Research and development of next-generation AI models with focus on explainability and ethics.',
          deadline: '2026-06-30',
          status: 'active'
        },
        {
          id: 2,
          title: 'Game Prototype Development',
          description: 'Development of a new game prototype with innovative gameplay mechanics.',
          deadline: '2026-07-15',
          status: 'active'
        }
      ];
    }
    
    // Save initial state
    this.saveState();
  }
  
  saveState() {
    localStorage.setItem('crewFactoryState', JSON.stringify(this.state));
  }
  
  render() {
    this.updateStats();
    this.renderCrews();
    this.renderBriefs();
  }
  
  updateStats() {
    document.getElementById('total-crews').textContent = this.state.crews.length;
    document.getElementById('active-members').textContent = this.state.crews.reduce((total, crew) => total + crew.members.length, 0);
    document.getElementById('projects').textContent = this.state.briefs.length;
  }
  
  renderCrews() {
    const crewList = document.getElementById('crew-list');
    if (!crewList) return;
    
    crewList.innerHTML = this.state.crews.map(crew => `
      <div class="crew-card">
        <h3>${crew.name}</h3>
        <p>${crew.description}</p>
        <div class="members">
          ${crew.members.map(member => `
            <img src="/team/avatars/${member.toLowerCase()}.jpg" alt="${member}" title="${member}">
          `).join('')}
        </div>
        <p><strong>Projects:</strong> ${crew.projects}</p>
      </div>
    `).join('');
  }
  
  renderBriefs() {
    const briefList = document.getElementById('brief-list');
    if (!briefList) return;
    
    briefList.innerHTML = this.state.briefs.map(brief => `
      <div class="brief-card">
        <h3>${brief.title}</h3>
        <p>${brief.description}</p>
        <div class="deadline">Deadline: ${this.formatDate(brief.deadline)}</div>
      </div>
    `).join('');
  }
  
  connectDiscord() {
    // Simulate Discord connection
    this.state.discordConnected = true;
    this.saveState();
    alert('Discord connected successfully!');
  }
  
  createBrief(e) {
    e.preventDefault();
    
    const title = document.getElementById('brief-title').value;
    const description = document.getElementById('brief-description').value;
    const deadline = document.getElementById('brief-deadline').value;
    
    if (!title || !description || !deadline) {
      alert('Please fill in all fields');
      return;
    }
    
    const newBrief = {
      id: Date.now(),
      title,
      description,
      deadline,
      status: 'active'
    };
    
    this.state.briefs.push(newBrief);
    this.saveState();
    this.render();
    
    // Reset form
    e.target.reset();
  }
  
  scrollToSection(sectionId) {
    const element = document.querySelector(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.crewFactoryApp = new CrewFactoryApp();
  
  // Expose gameState for automated testing
  if (typeof window.gameState === 'undefined') {
    window.gameState = {
      crews: window.crewFactoryApp.state.crews,
      briefs: window.crewFactoryApp.state.briefs,
      discordConnected: window.crewFactoryApp.state.discordConnected
    };
  }
});
