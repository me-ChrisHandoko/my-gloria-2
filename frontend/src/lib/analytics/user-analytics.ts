/**
 * Production-ready User Analytics Tracker
 *
 * Comprehensive user behavior tracking with:
 * - Page views and navigation tracking
 * - User interactions and events
 * - Session management
 * - User journey mapping
 * - Conversion tracking
 * - Privacy-compliant tracking
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UserProfile {
  userId?: string;
  anonymousId: string;
  traits?: Record<string, any>;
  createdAt: number;
  lastSeen: number;
}

export interface PageViewEvent {
  url: string;
  path: string;
  title: string;
  referrer: string;
  timestamp: number;
  properties?: Record<string, any>;
}

export interface TrackEvent {
  event: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface UserSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: number;
  duration: number;
  referrer: string;
  landingPage: string;
  exitPage?: string;
  device: DeviceInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  viewport: string;
  language: string;
  timezone: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  ip?: string;
}

export interface UserJourney {
  userId: string;
  sessions: UserSession[];
  totalPageViews: number;
  totalEvents: number;
  firstSeen: number;
  lastSeen: number;
  conversions: Conversion[];
}

export interface Conversion {
  goalId: string;
  goalName: string;
  value?: number;
  timestamp: number;
  sessionId: string;
  properties?: Record<string, any>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackPageViews: boolean;
  trackClicks: boolean;
  trackForms: boolean;
  trackScrollDepth: boolean;
  sessionTimeout: number; // in milliseconds
  cookieConsent: boolean;
  anonymizeIp: boolean;
  excludePaths: RegExp[];
  customDimensions?: Record<string, any>;
  debugMode: boolean;
}

export interface ConversionGoal {
  id: string;
  name: string;
  type: 'pageview' | 'event' | 'custom';
  matcher: (data: any) => boolean;
  value?: number;
}

// ============================================================================
// User Analytics Class
// ============================================================================

export class UserAnalytics {
  private config: AnalyticsConfig;
  private user: UserProfile | null = null;
  private session: UserSession | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private pageViewQueue: PageViewEvent[] = [];
  private eventQueue: TrackEvent[] = [];
  private conversionGoals: ConversionGoal[] = [];
  private isInitialized = false;
  private scrollDepth = 0;
  private clickListeners: Set<EventListener> = new Set();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      trackPageViews: true,
      trackClicks: true,
      trackForms: true,
      trackScrollDepth: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      cookieConsent: true,
      anonymizeIp: true,
      excludePaths: [],
      debugMode: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.isInitialized) return;

    // Check for cookie consent
    if (this.config.cookieConsent && !this.hasConsent()) {
      this.log('Analytics disabled: No cookie consent');
      return;
    }

    // Initialize user
    this.initializeUser();

    // Initialize session
    this.initializeSession();

    // Set up automatic tracking
    if (this.config.trackPageViews) {
      this.setupPageViewTracking();
    }

    if (this.config.trackClicks) {
      this.setupClickTracking();
    }

    if (this.config.trackForms) {
      this.setupFormTracking();
    }

    if (this.config.trackScrollDepth) {
      this.setupScrollTracking();
    }

    // Set up session management
    this.setupSessionManagement();

    // Process queued events
    this.processQueue();

    this.isInitialized = true;
    this.log('Analytics initialized');
  }

  /**
   * Check for cookie consent
   */
  private hasConsent(): boolean {
    // Check localStorage or cookie for consent
    const consent = localStorage.getItem('analytics-consent');
    return consent === 'true';
  }

  /**
   * Initialize user profile
   */
  private initializeUser(): void {
    // Try to load existing user
    const storedUser = this.loadUser();

    if (storedUser) {
      this.user = storedUser;
      this.user.lastSeen = Date.now();
    } else {
      // Create new user
      this.user = {
        anonymousId: this.getOrCreateAnonymousId(),
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
    }

    this.saveUser();
  }

  /**
   * Get or create anonymous ID
   */
  private getOrCreateAnonymousId(): string {
    let anonymousId = localStorage.getItem('analytics-anonymous-id');

    if (!anonymousId) {
      anonymousId = uuidv4();
      localStorage.setItem('analytics-anonymous-id', anonymousId);
    }

    return anonymousId;
  }

  /**
   * Initialize session
   */
  private initializeSession(): void {
    const storedSession = this.loadSession();

    if (storedSession && this.isSessionValid(storedSession)) {
      this.session = storedSession;
      this.session.lastActivity = Date.now();
    } else {
      // Create new session
      this.session = {
        sessionId: uuidv4(),
        startTime: Date.now(),
        lastActivity: Date.now(),
        pageViews: 0,
        events: 0,
        duration: 0,
        referrer: document.referrer,
        landingPage: window.location.href,
        device: this.getDeviceInfo(),
        location: this.getLocationInfo(),
      };
    }

    this.saveSession();
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(session: UserSession): boolean {
    const now = Date.now();
    return now - session.lastActivity < this.config.sessionTimeout;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Detect device type
    let deviceType: DeviceInfo['type'] = 'desktop';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    let browserVersion = 'Unknown';

    if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    }

    // Detect OS
    let os = 'Unknown';
    let osVersion = 'Unknown';

    if (platform.indexOf('Win') > -1) {
      os = 'Windows';
    } else if (platform.indexOf('Mac') > -1) {
      os = 'macOS';
    } else if (platform.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      os = 'Android';
    } else if (/iOS|iPhone|iPad|iPod/.test(userAgent)) {
      os = 'iOS';
    }

    return {
      type: deviceType,
      browser,
      browserVersion,
      os,
      osVersion,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Get location information (if available)
   */
  private getLocationInfo(): LocationInfo | undefined {
    // This would typically come from an IP geolocation service
    // For now, return undefined
    return undefined;
  }

  /**
   * Set up page view tracking
   */
  private setupPageViewTracking(): void {
    // Track initial page view
    this.trackPageView();

    // Listen for navigation changes (for SPAs)
    if (typeof window !== 'undefined') {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
          (window as any).analytics?.trackPageView();
        }, 0);
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
          (window as any).analytics?.trackPageView();
        }, 0);
      };

      window.addEventListener('popstate', () => {
        this.trackPageView();
      });
    }
  }

  /**
   * Set up click tracking
   */
  private setupClickTracking(): void {
    const clickHandler = (event: Event) => {
      const target = event.target as HTMLElement;

      // Track button clicks
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        const text = target.textContent?.trim() || '';
        const href = (target as HTMLAnchorElement).href || '';

        this.track('Click', {
          category: 'UI',
          action: 'click',
          label: text || href,
          properties: {
            element: target.tagName,
            text,
            href,
            id: target.id,
            className: target.className,
          },
        });
      }
    };

    document.addEventListener('click', clickHandler);
    this.clickListeners.add(clickHandler);
  }

  /**
   * Set up form tracking
   */
  private setupFormTracking(): void {
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;

      this.track('Form Submit', {
        category: 'Form',
        action: 'submit',
        label: form.id || form.name || 'Unknown Form',
        properties: {
          formId: form.id,
          formName: form.name,
          formAction: form.action,
          formMethod: form.method,
        },
      });
    });
  }

  /**
   * Set up scroll tracking
   */
  private setupScrollTracking(): void {
    let maxScrollDepth = 0;

    const scrollHandler = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollPercentage = Math.round((scrolled / scrollHeight) * 100);

      // Track in 25% increments
      const depth = Math.floor(scrollPercentage / 25) * 25;

      if (depth > maxScrollDepth && depth <= 100) {
        maxScrollDepth = depth;

        this.track('Scroll Depth', {
          category: 'Engagement',
          action: 'scroll',
          value: depth,
          properties: {
            depth,
            page: window.location.pathname,
          },
        });
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  /**
   * Set up session management
   */
  private setupSessionManagement(): void {
    // Reset timeout on activity
    const resetTimeout = () => {
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }

      this.sessionTimeout = setTimeout(() => {
        this.endSession();
        this.initializeSession();
      }, this.config.sessionTimeout);

      // Update session activity
      if (this.session) {
        this.session.lastActivity = Date.now();
        this.session.duration = Date.now() - this.session.startTime;
        this.saveSession();
      }
    };

    // Track activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimeout, { passive: true });
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Start initial timeout
    resetTimeout();
  }

  /**
   * Track page view
   */
  trackPageView(properties?: Record<string, any>): void {
    if (!this.config.enabled) return;

    // Check if path is excluded
    const path = window.location.pathname;
    if (this.config.excludePaths.some(regex => regex.test(path))) {
      return;
    }

    const pageView: PageViewEvent = {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
      timestamp: Date.now(),
      properties: {
        ...this.config.customDimensions,
        ...properties,
      },
    };

    if (!this.isInitialized) {
      this.pageViewQueue.push(pageView);
      return;
    }

    this.processPageView(pageView);
  }

  /**
   * Process page view
   */
  private processPageView(pageView: PageViewEvent): void {
    // Update session
    if (this.session) {
      this.session.pageViews++;
      this.session.exitPage = pageView.url;
      this.saveSession();
    }

    // Check for conversions
    this.checkConversions('pageview', pageView);

    // Send to analytics providers
    this.sendToProviders('pageview', pageView);

    this.log('Page view tracked:', pageView);
  }

  /**
   * Track custom event
   */
  track(event: string, data?: Partial<TrackEvent>): void {
    if (!this.config.enabled) return;

    const trackEvent: TrackEvent = {
      event,
      timestamp: Date.now(),
      ...data,
      properties: {
        ...this.config.customDimensions,
        ...data?.properties,
      },
    };

    if (!this.isInitialized) {
      this.eventQueue.push(trackEvent);
      return;
    }

    this.processEvent(trackEvent);
  }

  /**
   * Process event
   */
  private processEvent(event: TrackEvent): void {
    // Update session
    if (this.session) {
      this.session.events++;
      this.saveSession();
    }

    // Check for conversions
    this.checkConversions('event', event);

    // Send to analytics providers
    this.sendToProviders('event', event);

    this.log('Event tracked:', event);
  }

  /**
   * Identify user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.config.enabled || !this.user) return;

    this.user.userId = userId;
    this.user.traits = { ...this.user.traits, ...traits };
    this.saveUser();

    // Send to analytics providers
    this.sendToProviders('identify', { userId, traits });

    this.log('User identified:', userId);
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.user) return;

    this.user.traits = { ...this.user.traits, ...properties };
    this.saveUser();
  }

  /**
   * Add conversion goal
   */
  addConversionGoal(goal: ConversionGoal): void {
    this.conversionGoals.push(goal);
  }

  /**
   * Check for conversions
   */
  private checkConversions(type: 'pageview' | 'event', data: any): void {
    for (const goal of this.conversionGoals) {
      if (goal.type === type && goal.matcher(data)) {
        this.trackConversion(goal, data);
      }
    }
  }

  /**
   * Track conversion
   */
  private trackConversion(goal: ConversionGoal, data: any): void {
    const conversion: Conversion = {
      goalId: goal.id,
      goalName: goal.name,
      value: goal.value,
      timestamp: Date.now(),
      sessionId: this.session?.sessionId || '',
      properties: data.properties,
    };

    // Send to analytics providers
    this.sendToProviders('conversion', conversion);

    this.log('Conversion tracked:', conversion);
  }

  /**
   * End session
   */
  private endSession(): void {
    if (!this.session) return;

    this.session.duration = Date.now() - this.session.startTime;

    // Send session data to analytics
    this.sendToProviders('session', this.session);

    this.log('Session ended:', this.session);
  }

  /**
   * Process queued events
   */
  private processQueue(): void {
    // Process page views
    while (this.pageViewQueue.length > 0) {
      const pageView = this.pageViewQueue.shift();
      if (pageView) {
        this.processPageView(pageView);
      }
    }

    // Process events
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.processEvent(event);
      }
    }
  }

  /**
   * Send data to analytics providers
   */
  private sendToProviders(type: string, data: any): void {
    // This is where you would integrate with analytics services like:
    // - Google Analytics
    // - Mixpanel
    // - Amplitude
    // - Segment
    // - Custom analytics endpoint

    // For now, just log in debug mode
    if (this.config.debugMode) {
      console.log(`[Analytics] ${type}:`, data);
    }

    // Example: Send to custom endpoint
    if (typeof window !== 'undefined' && (window as any).analyticsEndpoint) {
      fetch((window as any).analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: Date.now() }),
      }).catch(error => {
        console.error('Failed to send analytics:', error);
      });
    }
  }

  /**
   * Save user to storage
   */
  private saveUser(): void {
    if (this.user) {
      localStorage.setItem('analytics-user', JSON.stringify(this.user));
    }
  }

  /**
   * Load user from storage
   */
  private loadUser(): UserProfile | null {
    const stored = localStorage.getItem('analytics-user');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Save session to storage
   */
  private saveSession(): void {
    if (this.session) {
      sessionStorage.setItem('analytics-session', JSON.stringify(this.session));
    }
  }

  /**
   * Load session from storage
   */
  private loadSession(): UserSession | null {
    const stored = sessionStorage.getItem('analytics-session');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Log message in debug mode
   */
  private log(...args: any[]): void {
    if (this.config.debugMode) {
      console.log('[Analytics]', ...args);
    }
  }

  /**
   * Get current user
   */
  getUser(): UserProfile | null {
    return this.user;
  }

  /**
   * Get current session
   */
  getSession(): UserSession | null {
    return this.session;
  }

  /**
   * Reset analytics (clear all data)
   */
  reset(): void {
    this.user = null;
    this.session = null;
    localStorage.removeItem('analytics-user');
    localStorage.removeItem('analytics-anonymous-id');
    sessionStorage.removeItem('analytics-session');

    // Reinitialize
    this.initialize();
  }

  /**
   * Disable analytics
   */
  disable(): void {
    this.config.enabled = false;

    // Clean up event listeners
    this.clickListeners.forEach(listener => {
      document.removeEventListener('click', listener as any);
    });
    this.clickListeners.clear();

    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
  }

  /**
   * Enable analytics
   */
  enable(): void {
    this.config.enabled = true;
    this.initialize();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userAnalytics = new UserAnalytics({
  enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  debugMode: process.env.NODE_ENV === 'development',
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track page view
 */
export function trackPageView(properties?: Record<string, any>): void {
  userAnalytics.trackPageView(properties);
}

/**
 * Track custom event
 */
export function trackEvent(event: string, data?: Partial<TrackEvent>): void {
  userAnalytics.track(event, data);
}

/**
 * Identify user
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  userAnalytics.identify(userId, traits);
}

/**
 * Add conversion goal
 */
export function addConversionGoal(goal: ConversionGoal): void {
  userAnalytics.addConversionGoal(goal);
}

export default userAnalytics;