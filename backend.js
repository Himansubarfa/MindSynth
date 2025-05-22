/**
 * MindSynth - Enhanced Text Summarizer & Mind Map Generator
 * Professional JavaScript Implementation with Download Functionality
 * @version 2.0.0
 * @author MindSynth Team
 */

'use strict';

/**
 * Application Configuration
 */
const CONFIG = {
  MAX_TEXT_LENGTH: 50000,
  MIN_TEXT_LENGTH: 100,
  DEFAULT_SUMMARY_POINTS: 5,
  MAX_SUMMARY_POINTS: 10,
  MINDMAP_DIMENSIONS: {
    width: 1200,
    height: 800,
    padding: 60
  },
  EXPORT_OPTIONS: {
    formats: ['png', 'svg', 'pdf'],
    quality: 1.0,
    background: '#ffffff'
  }
};

/**
 * Application State Manager
 */
class AppState {
  constructor() {
    this.user = null;
    this.currentTheme = 'light';
    this.summaryData = null;
    this.mindMapInstance = null;
    this.isProcessing = false;
  }

  setUser(userData) {
    this.user = userData;
    this.saveToStorage('user', userData);
  }

  clearUser() {
    this.user = null;
    this.removeFromStorage('user');
  }

  setSummaryData(data) {
    this.summaryData = data;
  }

  setMindMapInstance(instance) {
    this.mindMapInstance = instance;
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  loadFromStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }
}

/**
 * Utility Functions
 */
class Utils {
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static sanitizeText(text) {
    return text.replace(/<[^>]*>/g, '').trim();
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Toast Notification System
 */
class ToastManager {
  static show(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${this.getIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, duration);

    return toast;
  }

  static getIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }
}

/**
 * Text Processing Engine
 */
class TextProcessor {
  constructor() {
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
  }

  /**
   * Extract key sentences from text using advanced scoring
   */
  extractSummary(text, maxPoints = 5, analysisDepth = 'advanced') {
    try {
      const sentences = this.splitIntoSentences(text);
      
      if (sentences.length === 0) {
        throw new Error('No valid sentences found in the text');
      }

      const scoredSentences = this.scoreSentences(sentences, analysisDepth);
      const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(maxPoints, sentences.length))
        .sort((a, b) => a.position - b.position);

      return {
        sentences: topSentences.map(item => item.sentence),
        keywords: this.extractKeywords(text),
        wordCount: text.split(/\s+/).length,
        readingTime: Math.ceil(text.split(/\s+/).length / 200) // Average reading speed
      };

    } catch (error) {
      console.error('Error in text processing:', error);
      throw new Error('Failed to process text: ' + error.message);
    }
  }

  splitIntoSentences(text) {
    return text
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 500)
      .filter(s => /[.!?]$/.test(s));
  }

  scoreSentences(sentences, depth) {
    const wordFreq = this.calculateWordFrequency(sentences.join(' '));
    
    return sentences.map((sentence, index) => {
      let score = 0;
      const words = sentence.toLowerCase().split(/\s+/);
      
      // Position scoring (earlier sentences get slight boost)
      score += (sentences.length - index) / sentences.length * 0.1;
      
      // Length scoring (prefer medium-length sentences)
      const idealLength = 20;
      const lengthDiff = Math.abs(words.length - idealLength);
      score += Math.max(0, (idealLength - lengthDiff) / idealLength) * 0.2;
      
      // Word frequency scoring
      words.forEach(word => {
        if (!this.stopWords.has(word) && word.length > 3) {
          score += (wordFreq[word] || 0) * 0.3;
        }
      });
      
      // Keyword density
      if (depth === 'advanced') {
        score += this.calculateKeywordDensity(sentence, wordFreq) * 0.4;
      }
      
      return {
        sentence,
        score,
        position: index
      };
    });
  }

  calculateWordFrequency(text) {
    const words = text.toLowerCase().split(/\s+/);
    const freq = {};
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !this.stopWords.has(cleanWord)) {
        freq[cleanWord] = (freq[cleanWord] || 0) + 1;
      }
    });
    
    // Normalize frequencies
    const maxFreq = Math.max(...Object.values(freq));
    Object.keys(freq).forEach(word => {
      freq[word] = freq[word] / maxFreq;
    });
    
    return freq;
  }

  calculateKeywordDensity(sentence, wordFreq) {
    const words = sentence.toLowerCase().split(/\s+/);
    let density = 0;
    let count = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (wordFreq[cleanWord]) {
        density += wordFreq[cleanWord];
        count++;
      }
    });
    
    return count > 0 ? density / count : 0;
  }

  extractKeywords(text, maxKeywords = 10) {
    const wordFreq = this.calculateWordFrequency(text);
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Generate meaningful headings from text
   */
  generateHeadings(text, maxLength = 50) {
    const sentences = text.split(/[.!?]+/);
    
    for (let sentence of sentences) {
      sentence = sentence.trim();
      
      if (sentence.length === 0) continue;
      
      // Look for topic indicators
      const topicPatterns = [
        /^(the|this|these|that|those)\s+(.+)/i,
        /^(about|regarding|concerning)\s+(.+)/i,
        /^(.+?)\s+(is|are|was|were|involves|includes)/i
      ];
      
      for (let pattern of topicPatterns) {
        const match = sentence.match(pattern);
        if (match && match[2]) {
          let heading = match[2].trim();
          heading = this.capitalizeHeading(heading);
          
          if (heading.length <= maxLength) {
            return heading;
          } else {
            return this.truncateIntelligently(heading, maxLength);
          }
        }
      }
      
      // Fallback: use first meaningful part
      const words = sentence.split(/\s+/);
      let heading = '';
      
      for (let word of words) {
        if (heading.length + word.length + 1 <= maxLength) {
          heading += (heading ? ' ' : '') + word;
        } else {
          break;
        }
      }
      
      if (heading.length > 10) {
        return this.capitalizeHeading(heading);
      }
    }
    
    // Ultimate fallback
    const words = text.split(/\s+/).slice(0, 8).join(' ');
    return this.truncateIntelligently(words, maxLength);
  }

  truncateIntelligently(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Try to break at word boundaries
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace);
    }
    
    return truncated;
  }

  capitalizeHeading(text) {
    return text.split(' ')
      .map(word => {
        if (this.stopWords.has(word.toLowerCase()) && word !== text.split(' ')[0]) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
}

/**
 * Mind Map Generator with Enhanced Features
 */
class MindMapGenerator {
  constructor(container) {
    this.container = container;
    this.svg = null;
    this.data = null;
    this.zoom = d3.zoom();
    this.currentTransform = d3.zoomIdentity;
    this.nodeId = 0;
  }

  /**
   * Generate mind map from summary data
   */
  generate(summaryData) {
    try {
      this.clearExisting();
      this.data = this.processData(summaryData);
      this.createSVG();
      this.renderMindMap();
      this.setupInteractions();
      
      ToastManager.show('Mind map generated successfully', 'success');
      
    } catch (error) {
      console.error('Mind map generation failed:', error);
      ToastManager.show('Failed to generate mind map: ' + error.message, 'error');
    }
  }

  clearExisting() {
    const existing = this.container.querySelector('.mindmap-svg');
    if (existing) {
      existing.remove();
    }
    
    const emptyState = this.container.querySelector('#mindmap-empty');
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
  }

  processData(summaryData) {
    const processor = new TextProcessor();
    
    const rootData = {
      id: this.generateNodeId(),
      name: processor.generateHeadings(summaryData.sentences.join(' '), 30),
      type: 'root',
      children: []
    };

    // Process each summary sentence into a main branch
    summaryData.sentences.forEach((sentence, index) => {
      const heading = processor.generateHeadings(sentence, 40);
      const keywords = processor.extractKeywords(sentence, 4);
      
      const mainNode = {
        id: this.generateNodeId(),
        name: heading,
        fullText: sentence,
        type: 'main',
        children: []
      };

      // Add keyword children
      keywords.forEach(keyword => {
        mainNode.children.push({
          id: this.generateNodeId(),
          name: processor.capitalizeHeading(keyword),
          type: 'keyword',
          children: []
        });
      });

      rootData.children.push(mainNode);
    });

    return rootData;
  }

  createSVG() {
    const { width, height } = CONFIG.MINDMAP_DIMENSIONS;
    
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'mindmap-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add background for better export quality
    this.svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'var(--bg-color, #ffffff)');

    // Create main container group
    this.mainGroup = this.svg.append('g')
      .attr('class', 'mindmap-container');

    // Setup zoom behavior
    this.zoom
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.mainGroup.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);
  }

  renderMindMap() {
    const { width, height, padding } = CONFIG.MINDMAP_DIMENSIONS;
    
    // Create hierarchy
    const root = d3.hierarchy(this.data);
    
    // Create tree layout with better spacing
    const treeLayout = d3.tree()
      .size([width - padding * 2, height - padding * 2])
      .separation((a, b) => {
        return (a.parent === b.parent ? 1 : 2) / a.depth;
      });

    treeLayout(root);

    // Center the tree
    root.x += padding;
    root.y += padding;
    
    root.descendants().forEach(d => {
      d.x += padding;
      d.y += padding;
    });

    this.renderLinks(root);
    this.renderNodes(root);
  }

  renderLinks(root) {
    const linkGenerator = d3.linkHorizontal()
      .x(d => d.x)
      .y(d => d.y);

    this.mainGroup.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .style('stroke', d => this.getLinkColor(d.target.data.type))
      .style('stroke-width', d => this.getLinkWidth(d.target.data.type))
      .style('fill', 'none')
      .style('opacity', 0.7);
  }

  renderNodes(root) {
    const nodes = this.mainGroup.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', d => `node node-${d.data.type}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Add node circles
    nodes.append('circle')
      .attr('r', d => this.getNodeRadius(d.data.type))
      .style('fill', d => this.getNodeColor(d.data.type))
      .style('stroke', d => this.getNodeStroke(d.data.type))
      .style('stroke-width', 2);

    // Add node labels with better text handling
    nodes.each((d, i, nodeList) => {
      const node = d3.select(nodeList[i]);
      this.addNodeText(node, d);
    });

    // Add click handlers
    nodes.on('click', (event, d) => {
      event.stopPropagation();
      this.handleNodeClick(d);
    });

    // Add hover effects
    nodes.on('mouseenter', (event, d) => {
      this.showNodeTooltip(event, d);
    }).on('mouseleave', () => {
      this.hideNodeTooltip();
    });
  }

  addNodeText(node, d) {
    const radius = this.getNodeRadius(d.data.type);
    const maxWidth = radius * 3;
    
    const text = node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', this.getFontSize(d.data.type))
      .style('font-weight', d.data.type === 'root' ? 'bold' : 'normal')
      .style('fill', this.getTextColor(d.data.type));

    // Handle text wrapping for longer names
    const words = d.data.name.split(' ');
    if (words.join(' ').length > 20 && d.data.type !== 'keyword') {
      this.wrapText(text, words, maxWidth);
    } else {
      text.text(d.data.name);
    }

    // Position text below node for better readability
    if (d.data.type !== 'root') {
      text.attr('dy', radius + 15);
    }
  }

  wrapText(textElement, words, maxWidth) {
    let line = '';
    let lineCount = 0;
    const maxLines = 2;

    for (let i = 0; i < words.length && lineCount < maxLines; i++) {
      const testLine = line + (line ? ' ' : '') + words[i];
      
      // Estimate text width (rough approximation)
      if (testLine.length * 8 < maxWidth) {
        line = testLine;
      } else {
        if (line) {
          textElement.append('tspan')
            .attr('x', 0)
            .attr('dy', lineCount === 0 ? 0 : '1.2em')
            .text(line);
          lineCount++;
        }
        line = words[i];
      }
    }

    if (line && lineCount < maxLines) {
      textElement.append('tspan')
        .attr('x', 0)
        .attr('dy', lineCount === 0 ? 0 : '1.2em')
        .text(line);
    }
  }

  setupInteractions() {
    // Reset zoom button
    const resetBtn = document.getElementById('zoom-reset');
    if (resetBtn) {
      resetBtn.onclick = () => this.resetZoom();
    }

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
      zoomInBtn.onclick = () => this.zoomIn();
    }

    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.onclick = () => this.zoomOut();
    }
  }

  // Styling methods
  getNodeRadius(type) {
    const radii = { root: 30, main: 20, keyword: 12 };
    return radii[type] || 15;
  }

  getNodeColor(type) {
    const colors = {
      root: '#4f46e5',
      main: '#06b6d4', 
      keyword: '#10b981'
    };
    return colors[type] || '#6b7280';
  }

  getNodeStroke(type) {
    const strokes = {
      root: '#312e81',
      main: '#0891b2',
      keyword: '#059669'
    };
    return strokes[type] || '#374151';
  }

  getLinkColor(type) {
    const colors = {
      main: '#0891b2',
      keyword: '#6b7280'
    };
    return colors[type] || '#9ca3af';
  }

  getLinkWidth(type) {
    const widths = { main: 3, keyword: 2 };
    return widths[type] || 1;
  }

  getFontSize(type) {
    const sizes = { root: '14px', main: '12px', keyword: '10px' };
    return sizes[type] || '11px';
  }

  getTextColor(type) {
    return type === 'root' ? '#ffffff' : '#1f2937';
  }

  // Interaction methods
  handleNodeClick(d) {
    if (d.data.fullText) {
      ToastManager.show(d.data.fullText, 'info', 5000);
    }
  }

  showNodeTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    if (tooltip && d.data.fullText) {
      tooltip.textContent = d.data.fullText;
      tooltip.style.opacity = '1';
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY + 10}px`;
    }
  }

  hideNodeTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  }

  // Zoom methods
  resetZoom() {
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  zoomIn() {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1.2);
  }

  zoomOut() {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 0.8);
  }

  generateNodeId() {
    return `node_${++this.nodeId}`;
  }

  /**
   * Export mind map in various formats
   */
  async export(format = 'png', options = {}) {
    try {
      const svg = this.container.querySelector('.mindmap-svg');
      if (!svg) {
        throw new Error('No mind map to export');
      }

      const exportOptions = { ...CONFIG.EXPORT_OPTIONS, ...options };
      
      switch (format.toLowerCase()) {
        case 'png':
          return await this.exportAsPNG(svg, exportOptions);
        case 'svg':
          return await this.exportAsSVG(svg, exportOptions);
        case 'pdf':
          return await this.exportAsPDF(svg, exportOptions);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      ToastManager.show(`Export failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async exportAsPNG(svg, options) {
    return new Promise((resolve, reject) => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const rect = svg.getBoundingClientRect();
        canvas.width = rect.width * options.quality;
        canvas.height = rect.height * options.quality;
        
        // Scale context for high quality
        ctx.scale(options.quality, options.quality);
        
        // Add background
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        // Create image and draw to canvas
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          
          // Convert to blob and download
          canvas.toBlob((blob) => {
            this.downloadBlob(blob, 'mindmap.png');
            resolve(blob);
          }, 'image/png');
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG for conversion'));
        };
        
        img.src = url;
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async exportAsSVG(svg, options) {
    try {
      // Clone SVG to avoid modifying original
      const clonedSvg = svg.cloneNode(true);
      
      // Add styles to SVG for standalone use
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = this.getSVGStyles();
      clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
      
      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      // Download
      this.downloadBlob(blob, 'mindmap.svg');
      
      return blob;
    } catch (error) {
      throw new Error('SVG export failed: ' + error.message);
    }
  }

  async exportAsPDF(svg, options) {
    // Note: This would require a PDF library like jsPDF or pdf-lib
    // For now, we'll export as PNG and suggest PDF conversion
    ToastManager.show('PDF export requires additional library. Exporting as PNG instead.', 'info');
    return await this.exportAsPNG(svg, options);
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    ToastManager.show(`${filename} downloaded successfully`, 'success');
  }

  getSVGStyles() {
    return `
      .link {
        fill: none;
        stroke-opacity: 0.7;
      }
      .node circle {
        stroke-width: 2;
      }
      .node text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: none;
      }
      .node-root circle {
        fill: #4f46e5;
        stroke: #312e81;
      }
      .node-root text {
        fill: #ffffff;
        font-weight: bold;
        font-size: 14px;
      }
      .node-main circle {
        fill: #06b6d4;
        stroke: #0891b2;
      }
      .node-main text {
        fill: #1f2937;
        font-size: 12px;
      }
      .node-keyword circle {
        fill: #10b981;
        stroke: #059669;
      }
      .node-keyword text {
        fill: #1f2937;
        font-size: 10px;
      }
    `;
  }
}

/**
 * Main Application Class
 */
class MindSynthApp {
  constructor() {
    this.state = new AppState();
    this.textProcessor = new TextProcessor();
    this.mindMapGenerator = null;
    this.init();
  }

  init() {
    this.loadSavedState();
    this.initializeComponents();
    this.setupEventListeners();
    ToastManager.show('MindSynth initialized successfully', 'success', 2000);
  }

  loadSavedState() {
    // Load theme
    const savedTheme = this.state.loadFromStorage('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.state.currentTheme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Load user
    const savedUser = this.state.loadFromStorage('user');
    if (savedUser) {
      this.state.setUser(savedUser);
      this.updateUserInterface(savedUser);
    }
  }

  initializeComponents() {
    this.initThemeToggle();
    this.initTabs();
    this.initTextInput();
    this.initOptionsMenu();
    this.initAuthModal();
    this.initTooltips();
    this.initButtons();
    this.initMindMapContainer();
  }

  setupEventListeners() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      ToastManager.show('An unexpected error occurred', 'error');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      ToastManager.show('An unexpected error occurred', 'error');
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      ToastManager.show('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      ToastManager.show('Connection lost - working offline', 'warning');
    });
  }

  initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('i');
    
    if (!themeToggle || !themeIcon) return;

    // Set initial icon state
    if (this.state.currentTheme === 'dark') {
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggle.addEventListener('click', () => {
      const isDark = this.state.currentTheme === 'dark';
      
      if (isDark) {
        this.state.currentTheme = 'light';
        document.documentElement.removeAttribute('data-theme');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
      } else {
        this.state.currentTheme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
      }
      
      this.state.saveToStorage('theme', this.state.currentTheme);
      ToastManager.show(`Switched to ${this.state.currentTheme} theme`, 'info', 1500);
    });
  }

  initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const targetTab = tab.getAttribute('data-tab');
        this.switchTab(targetTab, tabs, tabContents);
      });
    });

    // Tab navigation buttons
    this.setupTabNavigation();
  }

  setupTabNavigation() {
    const navButtons = [
      { id: 'go-to-input-btn', tab: 'input' },
      { id: 'go-to-summary-btn', tab: 'summary' },
      { id: 'summary-to-mindmap-btn', tab: 'mindmap', callback: () => this.generateMindMapFromSummary() }
    ];

    navButtons.forEach(({ id, tab, callback }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => {
          this.switchToTab(tab);
          if (callback) callback();
        });
      }
    });
  }

  switchTab(targetTab, tabs, tabContents) {
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${targetTab}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Show corresponding content
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `tab-${targetTab}`) {
        content.classList.add('active');
      }
    });
  }

  switchToTab(tabName) {
    const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (tab) tab.click();
  }

  initTextInput() {
    const textInput = document.getElementById('text-input');
    const charCount = document.getElementById('char-count');
    
    if (!textInput || !charCount) return;

    // Debounced character count update
    const updateCharCount = Utils.debounce(() => {
      const count = textInput.value.length;
      charCount.textContent = count.toLocaleString();
      
      // Visual feedback for limits
      if (count > CONFIG.MAX_TEXT_LENGTH) {
        charCount.style.color = 'var(--error-color, #ef4444)';
        ToastManager.show(`Text exceeds maximum length of ${CONFIG.MAX_TEXT_LENGTH.toLocaleString()} characters`, 'warning');
      } else if (count < CONFIG.MIN_TEXT_LENGTH) {
        charCount.style.color = 'var(--warning-color, #f59e0b)';
      } else {
        charCount.style.color = 'var(--success-color, #10b981)';
      }
    }, 300);

    textInput.addEventListener('input', updateCharCount);

    // Setup text input buttons
    this.setupTextInputButtons(textInput, charCount);
  }

  setupTextInputButtons(textInput, charCount) {
    const buttons = [
      { id: 'clear-btn', action: () => this.clearText(textInput, charCount) },
      { id: 'paste-btn', action: () => this.pasteText(textInput, charCount) },
      { id: 'sample-text-btn', action: () => this.loadSampleText(textInput, charCount) }
    ];

    buttons.forEach(({ id, action }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', action);
      }
    });
  }

  clearText(textInput, charCount) {
    if (textInput.value.trim() === '') {
      ToastManager.show('Text is already empty', 'info');
      return;
    }

    textInput.value = '';
    charCount.textContent = '0';
    charCount.style.color = '';
    ToastManager.show('Text cleared successfully', 'success');
  }

  async pasteText(textInput, charCount) {
    try {
      const text = await navigator.clipboard.readText();
      
      if (!text.trim()) {
        ToastManager.show('Clipboard is empty', 'warning');
        return;
      }

      if (text.length > CONFIG.MAX_TEXT_LENGTH) {
        ToastManager.show(`Text too long. Maximum ${CONFIG.MAX_TEXT_LENGTH.toLocaleString()} characters allowed`, 'error');
        return;
      }

      textInput.value = text;
      charCount.textContent = text.length.toLocaleString();
      ToastManager.show('Text pasted successfully', 'success');
      
    } catch (error) {
      console.error('Paste failed:', error);
      ToastManager.show('Unable to paste from clipboard. Please check permissions.', 'error');
    }
  }

  loadSampleText(textInput, charCount) {
    const sampleTexts = [
      {
        title: "Artificial Intelligence Overview",
        content: `Artificial intelligence (AI) represents one of the most transformative technologies of our time, fundamentally changing how we interact with machines and process information. At its core, AI refers to the development of computer systems capable of performing tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation. The field encompasses various approaches, including machine learning, where algorithms improve their performance through experience, and deep learning, which uses neural networks to process complex patterns in data. Modern AI applications span across industries, from healthcare diagnostics and autonomous vehicles to financial fraud detection and personalized recommendations. The technology's rapid advancement has been fueled by increased computational power, vast amounts of data, and sophisticated algorithms that can learn and adapt. However, this progress also raises important questions about ethics, privacy, and the future of work, as AI systems become increasingly capable of performing tasks once thought to be exclusively human domains.`
      },
      {
        title: "Climate Change and Environmental Impact",
        content: `Climate change represents the most pressing environmental challenge of the 21st century, with far-reaching consequences for ecosystems, human societies, and the global economy. The phenomenon is primarily driven by the accumulation of greenhouse gases in the atmosphere, particularly carbon dioxide from fossil fuel combustion, deforestation, and industrial processes. These gases trap heat from the sun, leading to a gradual warming of Earth's surface and significant alterations in weather patterns. The effects are already visible worldwide: rising sea levels threaten coastal communities, extreme weather events become more frequent and severe, and shifts in precipitation patterns affect agriculture and water resources. Arctic ice is melting at unprecedented rates, contributing to sea-level rise and disrupting ocean currents that regulate global climate. The biodiversity crisis is closely linked to climate change, as species struggle to adapt to rapidly changing conditions, leading to habitat loss and extinction risks. Addressing climate change requires coordinated global action, including transitioning to renewable energy sources, improving energy efficiency, protecting and restoring natural ecosystems, and developing innovative technologies for carbon capture and storage.`
      },
      {
        title: "The Human Brain and Cognitive Function",
        content: `The human brain stands as one of nature's most remarkable achievements, containing approximately 86 billion neurons interconnected through trillions of synapses that enable thought, memory, emotion, and consciousness. This three-pound organ consumes about 20% of the body's energy despite representing only 2% of body weight, highlighting its critical importance to human function. The brain's structure is highly organized, with different regions specialized for specific functions: the frontal cortex handles executive functions and decision-making, the hippocampus processes memory formation, the occipital lobe processes visual information, and the cerebellum coordinates movement and balance. Neuroplasticity, the brain's ability to reorganize and form new neural connections throughout life, allows for learning, adaptation, and recovery from injury. Modern neuroscience has revealed the brain's incredible complexity, showing how networks of neurons work together to create our thoughts, emotions, and behaviors. Understanding brain function has led to breakthrough treatments for neurological and psychiatric conditions, from Parkinson's disease to depression. Research continues to uncover the mysteries of consciousness, memory formation, and the biological basis of human behavior, with implications for artificial intelligence, education, and mental health treatment.`
      }
    ];

    const randomSample = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    textInput.value = randomSample.content;
    charCount.textContent = randomSample.content.length.toLocaleString();
    
    ToastManager.show(`Sample text loaded: "${randomSample.title}"`, 'info');
  }

  initOptionsMenu() {
    const optionsToggle = document.getElementById('options-toggle');
    const optionsDropdown = document.getElementById('options-dropdown');
    
    if (!optionsToggle || !optionsDropdown) return;

    optionsToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      optionsDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!optionsToggle.contains(event.target) && !optionsDropdown.contains(event.target)) {
        optionsDropdown.classList.add('hidden');
      }
    });
  }

  initAuthModal() {
    const elements = {
      loginBtn: document.getElementById('login-btn'),
      logoutBtn: document.getElementById('logout-btn'),
      userProfile: document.querySelector('.user-profile'),
      authModal: document.getElementById('auth-modal'),
      closeModal: document.getElementById('close-modal')
    };

    if (!elements.authModal) return;

    this.setupAuthEvents(elements);
    this.setupAuthForms();
    this.setupSocialLogin();
  }

  setupAuthEvents(elements) {
    const { loginBtn, logoutBtn, authModal, closeModal } = elements;

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      });
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => {
        this.closeAuthModal(authModal);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Close modal when clicking outside
    authModal.addEventListener('click', (event) => {
      if (event.target === authModal) {
        this.closeAuthModal(authModal);
      }
    });

    // ESC key to close modal
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !authModal.classList.contains('hidden')) {
        this.closeAuthModal(authModal);
      }
    });
  }

  closeAuthModal(authModal) {
    authModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  setupAuthForms() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const modalTitle = document.getElementById('modal-title');

    // Tab switching
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (targetTab === 'signin') {
          modalTitle.textContent = 'Sign In to MindSynth';
          signinForm.classList.remove('hidden');
          signupForm.classList.add('hidden');
        } else {
          modalTitle.textContent = 'Create MindSynth Account';
          signinForm.classList.add('hidden');
          signupForm.classList.remove('hidden');
        }
      });
    });

    // Password visibility toggles
    this.setupPasswordToggles();

    // Form submissions
    if (signinForm) {
      signinForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSignIn(new FormData(signinForm));
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSignUp(new FormData(signupForm));
      });
    }
  }

  setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.toggle-password');
    
    passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const passwordField = toggle.previousElementSibling;
        const icon = toggle.querySelector('i');
        
        if (passwordField.type === 'password') {
          passwordField.type = 'text';
          icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
          passwordField.type = 'password';
          icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
      });
    });
  }

  handleSignIn(formData) {
    const email = formData.get('email')?.trim();
    const password = formData.get('password');

    if (!this.validateEmail(email)) {
      ToastManager.show('Please enter a valid email address', 'error');
      return;
    }

    if (!password || password.length < 6) {
      ToastManager.show('Password must be at least 6 characters long', 'error');
      return;
    }

    // Simulate authentication
    this.simulateAuth(email, null, 'signin');
  }

  handleSignUp(formData) {
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    const termsAccepted = formData.get('terms') === 'on';

    if (!name || name.length < 2) {
      ToastManager.show('Please enter a valid name', 'error');
      return;
    }

    if (!this.validateEmail(email)) {
      ToastManager.show('Please enter a valid email address', 'error');
      return;
    }

    if (!password || password.length < 6) {
      ToastManager.show('Password must be at least 6 characters long', 'error');
      return;
    }

    if (!termsAccepted) {
      ToastManager.show('Please accept the terms and conditions', 'error');
      return;
    }

    // Simulate authentication
    this.simulateAuth(email, name, 'signup');
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailRegex.test(email);
  }

  simulateAuth(email, name, type) {
    const button = document.querySelector(`#${type}-form button[type="submit"]`);
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = type === 'signin' ? 'Signing in...' : 'Creating account...';
    button.disabled = true;

    // Simulate API call delay
    setTimeout(() => {
      const displayName = name ? name.split(' ')[0] : email.split('@')[0];
      const initials = (name || displayName).split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

      const userData = {
        email,
        name: displayName,
        initials,
        joinDate: new Date().toISOString()
      };

      this.state.setUser(userData);
      this.updateUserInterface(userData);
      this.closeAuthModal(document.getElementById('auth-modal'));

      const message = type === 'signin' ? 
        `Welcome back, ${displayName}!` : 
        `Welcome to MindSynth, ${displayName}!`;
      
      ToastManager.show(message, 'success');

      // Reset form
      button.textContent = originalText;
      button.disabled = false;
      
    }, 1500);
  }

  updateUserInterface(userData) {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.querySelector('.user-profile');
    const username = document.querySelector('.username');
    const avatar = document.querySelector('.avatar');

    if (loginBtn) loginBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    if (username) username.textContent = userData.name;
    if (avatar) avatar.textContent = userData.initials;
  }

  handleLogout() {
    this.state.clearUser();
    
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.querySelector('.user-profile');

    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userProfile) userProfile.classList.add('hidden');

    ToastManager.show('Successfully logged out', 'info');
  }

  setupSocialLogin() {
    const socialButtons = document.querySelectorAll('.social-btn');
    
    socialButtons.forEach(button => {
      button.addEventListener('click', () => {
        const provider = button.classList.contains('google') ? 'Google' : 
                        button.classList.contains('facebook') ? 'Facebook' : 'Twitter';
        
        ToastManager.show(`${provider} authentication would be integrated here`, 'info');
      });
    });
  }

  initTooltips() {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;

    const elements = document.querySelectorAll('[title]');
    
    elements.forEach(element => {
      const title = element.getAttribute('title');
      element.removeAttribute('title');
      element.setAttribute('data-tooltip', title);

      const showTooltip = Utils.throttle((event) => {
        tooltip.textContent = title;
        tooltip.style.opacity = '1';
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.bottom + 10;
        
        // Keep tooltip within viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
          left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top + tooltipRect.height > window.innerHeight - 10) {
          top = rect.top - tooltipRect.height - 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }, 100);

      element.addEventListener('mouseenter', showTooltip);
      element.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  }

  initButtons() {
    const buttons = [
      { id: 'summarize-btn', action: () => this.handleSummarize() },
      { id: 'generate-btn', action: () => this.handleGenerateMindMap() },
      { id: 'copy-summary-btn', action: () => this.handleCopySummary() },
      { id: 'export-summary-btn', action: () => this.handleExportSummary() },
      { id: 'save-mindmap-btn', action: () => this.handleSaveMindMap() },
      { id: 'share-mindmap-btn', action: () => this.handleShareMindMap() }
    ];

    buttons.forEach(({ id, action }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', action);
      }
    });
  }

  async handleSummarize() {
    const textInput = document.getElementById('text-input');
    const text = textInput?.value.trim();

    if (!text) {
      ToastManager.show('Please enter some text to summarize', 'error');
      return;
    }

    if (text.length < CONFIG.MIN_TEXT_LENGTH) {
      ToastManager.show(`Text must be at least ${CONFIG.MIN_TEXT_LENGTH} characters long`, 'error');
      return;
    }

    if (text.length > CONFIG.MAX_TEXT_LENGTH) {
      ToastManager.show(`Text exceeds maximum length of ${CONFIG.MAX_TEXT_LENGTH.toLocaleString()} characters`, 'error');
      return;
    }

    if (this.state.isProcessing) {
      ToastManager.show('Please wait for the current operation to complete', 'warning');
      return;
    }

    this.state.isProcessing = true;
    const button = document.getElementById('summarize-btn');
    const spinner = document.getElementById('summarize-spinner');
    const originalText = button?.querySelector('span')?.textContent;

    try {
      // Update UI to show processing
      if (button?.querySelector('span')) {
        button.querySelector('span').textContent = 'Analyzing text...';
      }
      if (spinner) spinner.classList.remove('hidden');

      // Get processing options
      const summaryLength = parseInt(document.getElementById('summary-length')?.value || CONFIG.DEFAULT_SUMMARY_POINTS);
      const analysisDepth = document.getElementById('analysis-depth')?.value || 'advanced';

      // Process text
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate processing time
      const summaryData = this.textProcessor.extractSummary(text, summaryLength, analysisDepth);
      
      this.state.setSummaryData(summaryData);
      this.displaySummary(summaryData);
      this.switchToTab('summary');

      ToastManager.show('Summary created successfully', 'success');

    } catch (error) {
      console.error('Summarization failed:', error);
      ToastManager.show('Failed to create summary: ' + error.message, 'error');
    } finally {
      // Reset UI
      if (button?.querySelector('span') && originalText) {
        button.querySelector('span').textContent = originalText;
      }
      if (spinner) spinner.classList.add('hidden');
      this.state.isProcessing = false;
    }
  }

  displaySummary(summaryData) {
    const summaryList = document.getElementById('summary-list');
    const summaryContent = document.getElementById('summary-content');
    const summaryEmpty = document.getElementById('summary-empty');
    const summaryStats = document.getElementById('summary-stats');

    if (!summaryList) return;

    // Clear existing content
    summaryList.innerHTML = '';

    // Add summary points
    summaryData.sentences.forEach((sentence, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="summary-item">
          <span class="summary-number">${index + 1}</span>
          <span class="summary-text">${sentence}</span>
        </div>
      `;
      summaryList.appendChild(li);
    });

    // Update stats
    if (summaryStats) {
      summaryStats.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Word Count:</span>
          <span class="stat-value">${summaryData.wordCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Reading Time:</span>
          <span class="stat-value">${summaryData.readingTime} min</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Summary Points:</span>
          <span class="stat-value">${summaryData.sentences.length}</span>
        </div>
      `;
    }

    // Show content, hide empty state
    if (summaryContent) summaryContent.classList.remove('hidden');
    if (summaryEmpty) summaryEmpty.classList.add('hidden');
  }

  async handleGenerateMindMap() {
    const textInput = document.getElementById('text-input');
    const text = textInput?.value.trim();

    if (!text) {
      ToastManager.show('Please enter some text to generate a mind map', 'error');
      return;
    }

    if (this.state.isProcessing) {
      ToastManager.show('Please wait for the current operation to complete', 'warning');
      return;
    }

    this.state.isProcessing = true;
    const button = document.getElementById('generate-btn');
    const spinner = document.getElementById('generate-spinner');
    const originalText = button?.querySelector('span')?.textContent;

    try {
      // Update UI
      if (button?.querySelector('span')) {
        button.querySelector('span').textContent = 'Generating...';
      }
      if (spinner) spinner.classList.remove('hidden');

      // Process text if not already done
      if (!this.state.summaryData) {
        const summaryLength = parseInt(document.getElementById('summary-length')?.value || CONFIG.DEFAULT_SUMMARY_POINTS);
        const analysisDepth = document.getElementById('analysis-depth')?.value || 'advanced';
        
        await new Promise(resolve => setTimeout(resolve, 800));
        const summaryData = this.textProcessor.extractSummary(text, summaryLength, analysisDepth);
        this.state.setSummaryData(summaryData);
        this.displaySummary(summaryData);
      }

      // Generate mind map
      await new Promise(resolve => setTimeout(resolve, 700));
      this.generateMindMapFromSummary();
      this.switchToTab('mindmap');

      ToastManager.show('Mind map generated successfully', 'success');

    } catch (error) {
      console.error('Mind map generation failed:', error);
      ToastManager.show('Failed to generate mind map: ' + error.message, 'error');
    } finally {
      // Reset UI
      if (button?.querySelector('span') && originalText) {
        button.querySelector('span').textContent = originalText;
      }
      if (spinner) spinner.classList.add('hidden');
      this.state.isProcessing = false;
    }
  }

  generateMindMapFromSummary() {
    if (!this.state.summaryData) {
      ToastManager.show('Please create a summary first', 'error');
      return;
    }

    if (!this.mindMapGenerator) {
      const container = document.getElementById('mindmap-container');
      if (!container) {
        ToastManager.show('Mind map container not found', 'error');
        return;
      }
      this.mindMapGenerator = new MindMapGenerator(container);
    }

    this.mindMapGenerator.generate(this.state.summaryData);
    this.state.setMindMapInstance(this.mindMapGenerator);
  }

  async handleCopySummary() {
    if (!this.state.summaryData || !this.state.summaryData.sentences.length) {
      ToastManager.show('No summary to copy', 'error');
      return;
    }

    try {
      const summaryText = this.state.summaryData.sentences
        .map((sentence, index) => `${index + 1}. ${sentence}`)
        .join('\n\n');

      await navigator.clipboard.writeText(summaryText);
      ToastManager.show('Summary copied to clipboard', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      ToastManager.show('Failed to copy summary to clipboard', 'error');
    }
  }

  handleExportSummary() {
    if (!this.state.summaryData || !this.state.summaryData.sentences.length) {
      ToastManager.show('No summary to export', 'error');
      return;
    }

    try {
      const summaryText = this.formatSummaryForExport();
      const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `summary_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      ToastManager.show('Summary exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      ToastManager.show('Failed to export summary', 'error');
    }
  }

  formatSummaryForExport() {
    const data = this.state.summaryData;
    const date = new Date().toLocaleDateString();
    
    return `MindSynth Text Summary
Generated on: ${date}

SUMMARY STATISTICS:
- Word Count: ${data.wordCount.toLocaleString()}
- Reading Time: ${data.readingTime} minutes
- Summary Points: ${data.sentences.length}

SUMMARY:

${data.sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n\n')}

${data.keywords && data.keywords.length > 0 ? `\nKEY TERMS:\n${data.keywords.join(', ')}` : ''}

---
Generated by MindSynth - Text Summarizer & Mind Map Generator`;
  }

  async handleSaveMindMap() {
    if (!this.state.mindMapInstance) {
      ToastManager.show('No mind map to save', 'error');
      return;
    }

    try {
      // Show format selection dialog
      const format = await this.showFormatSelectionDialog();
      if (!format) return; // User cancelled

      await this.state.mindMapInstance.export(format);
      
    } catch (error) {
      console.error('Save failed:', error);
      ToastManager.show('Failed to save mind map: ' + error.message, 'error');
    }
  }

  async showFormatSelectionDialog() {
    return new Promise((resolve) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'format-selection-modal';
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Choose Export Format</h3>
              <button class="close-btn" onclick="this.closest('.format-selection-modal').remove(); resolve(null);">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="format-options">
                <button class="format-option" data-format="png">
                  <i class="fas fa-image"></i>
                  <span>PNG Image</span>
                  <small>High quality raster image</small>
                </button>
                <button class="format-option" data-format="svg">
                  <i class="fas fa-vector-square"></i>
                  <span>SVG Vector</span>
                  <small>Scalable vector graphics</small>
                </button>
                <button class="format-option" data-format="pdf">
                  <i class="fas fa-file-pdf"></i>
                  <span>PDF Document</span>
                  <small>Portable document format</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add event listeners
      modal.querySelectorAll('.format-option').forEach(button => {
        button.addEventListener('click', () => {
          const format = button.getAttribute('data-format');
          modal.remove();
          resolve(format);
        });
      });

      // Close on overlay click
      modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          modal.remove();
          resolve(null);
        }
      });

      document.body.appendChild(modal);
    });
  }

  handleShareMindMap() {
    if (!this.state.mindMapInstance) {
      ToastManager.show('No mind map to share', 'error');
      return;
    }

    // Check if Web Share API is supported
    if (navigator.share) {
      this.handleNativeShare();
    } else {
      this.handleCustomShare();
    }
  }

  async handleNativeShare() {
    try {
      await navigator.share({
        title: 'My MindSynth Mind Map',
        text: 'Check out this mind map I created with MindSynth!',
        url: window.location.href
      });
      
      ToastManager.show('Shared successfully', 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        this.handleCustomShare();
      }
    }
  }

  handleCustomShare() {
    // Create share modal
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Share Mind Map</h3>
            <button class="close-btn" onclick="this.closest('.share-modal').remove();">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="share-options">
              <button class="share-option" data-action="copy-link">
                <i class="fas fa-link"></i>
                <span>Copy Link</span>
              </button>
              <button class="share-option" data-action="email">
                <i class="fas fa-envelope"></i>
                <span>Email</span>
              </button>
              <button class="share-option" data-action="twitter">
                <i class="fab fa-twitter"></i>
                <span>Twitter</span>
              </button>
              <button class="share-option" data-action="linkedin">
                <i class="fab fa-linkedin"></i>
                <span>LinkedIn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelectorAll('.share-option').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        this.executeShareAction(action);
        modal.remove();
      });
    });

    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  async executeShareAction(action) {
    const url = window.location.href;
    const title = 'My MindSynth Mind Map';
    const text = 'Check out this mind map I created with MindSynth!';

    switch (action) {
      case 'copy-link':
        try {
          await navigator.clipboard.writeText(url);
          ToastManager.show('Link copied to clipboard', 'success');
        } catch (error) {
          ToastManager.show('Failed to copy link', 'error');
        }
        break;

      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`);
        break;

      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;

      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
        break;

      default:
        ToastManager.show('Share action not implemented', 'info');
    }
  }

  initMindMapContainer() {
    const container = document.getElementById('mindmap-container');
    if (!container) return;

    // Initialize zoom controls
    this.setupZoomControls();
    
    // Initialize fullscreen
    this.setupFullscreen();
  }

  setupZoomControls() {
    const zoomControls = {
      'zoom-in': () => this.state.mindMapInstance?.zoomIn(),
      'zoom-out': () => this.state.mindMapInstance?.zoomOut(),
      'zoom-reset': () => this.state.mindMapInstance?.resetZoom()
    };

    Object.entries(zoomControls).forEach(([id, action]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', action);
      }
    });
  }

  setupFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen');
    const container = document.getElementById('mindmap-container');
    
    if (!fullscreenBtn || !container) return;

    fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen(container, fullscreenBtn);
    });

    // Handle fullscreen change events
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.handleFullscreenChange(fullscreenBtn);
      });
    });
  }

  toggleFullscreen(element, button) {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      const requestFullscreen = element.requestFullscreen || 
                               element.mozRequestFullScreen || 
                               element.webkitRequestFullscreen || 
                               element.msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(element);
      }
    } else {
      // Exit fullscreen
      const exitFullscreen = document.exitFullscreen || 
                            document.mozCancelFullScreen || 
                            document.webkitExitFullscreen || 
                            document.msExitFullscreen;
      
      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
    }
  }

  handleFullscreenChange(button) {
    const icon = button.querySelector('i');
    const isFullscreen = !!document.fullscreenElement;
    
    if (isFullscreen) {
      icon.classList.replace('fa-expand', 'fa-compress');
      button.setAttribute('title', 'Exit fullscreen');
    } else {
      icon.classList.replace('fa-compress', 'fa-expand');
      button.setAttribute('title', 'Enter fullscreen');
    }
  }

  // Public API methods
  getSummaryData() {
    return this.state.summaryData;
  }

  getMindMapInstance() {
    return this.state.mindMapInstance;
  }

  getCurrentUser() {
    return this.state.user;
  }

  // Error handling
  handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    const userMessage = this.getUserFriendlyErrorMessage(error);
    ToastManager.show(userMessage, 'error');
  }

  getUserFriendlyErrorMessage(error) {
    if (error.message.includes('clipboard')) {
      return 'Clipboard access denied. Please check your browser permissions.';
    }
    
    if (error.message.includes('storage')) {
      return 'Unable to save data. Please check your browser storage settings.';
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize the main application
    window.mindSynthApp = new MindSynthApp();
    
    // Make utilities available globally for debugging
    if (process.env.NODE_ENV === 'development') {
      window.MindSynthUtils = { Utils, ToastManager, TextProcessor, MindMapGenerator };
    }
    
    console.log('MindSynth application initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize MindSynth:', error);
    // temporarily commented out the error handling for fallback UI
    // // Show fallback error message
    // const errorDiv = document.createElement('div');
    // errorDiv.className = 'init-error';
    // errorDiv.innerHTML = `
    //   <div class="error-content">
    //     <h3>Initialization Error</h3>
    //     <p>MindSynth failed to load properly. Please refresh the page or try again later.</p>
    //     <button onclick="window.location.reload()">Refresh Page</button>
    //   </div>
    // `;
    
    // document.body.appendChild(errorDiv);
  }
});

/**
 * Handle page visibility changes for performance optimization
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden - pause animations, etc.
    console.log('Page hidden - pausing background processes');
  } else {
    // Page is visible - resume operations
    console.log('Page visible - resuming normal operation');
  }
});

/**
 * Handle page unload for cleanup
 */
window.addEventListener('beforeunload', () => {
  // Cleanup operations
  console.log('MindSynth shutting down');
});

/**
 * Export for module systems
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MindSynthApp, TextProcessor, MindMapGenerator, Utils, ToastManager };
}