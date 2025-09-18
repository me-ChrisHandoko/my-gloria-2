/**
 * Production-ready Analytics Providers Integration
 *
 * Unified interface for multiple analytics platforms:
 * - Google Analytics
 * - Mixpanel
 * - Amplitude
 * - Segment
 * - PostHog
 * - Custom providers
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AnalyticsProvider {
  name: string;
  enabled: boolean;
  initialize(config: any): Promise<void>;
  identify(userId: string, traits?: Record<string, any>): void;
  track(event: string, properties?: Record<string, any>): void;
  page(name?: string, properties?: Record<string, any>): void;
  group(groupId: string, traits?: Record<string, any>): void;
  alias(userId: string, previousId?: string): void;
  reset(): void;
  setUserProperties(properties: Record<string, any>): void;
  incrementUserProperty(property: string, value?: number): void;
  setGroupProperties(groupId: string, properties: Record<string, any>): void;
  trackRevenue(amount: number, properties?: Record<string, any>): void;
  trackError(error: Error, properties?: Record<string, any>): void;
  flush(): Promise<void>;
}

export interface AnalyticsConfig {
  providers: ProviderConfig[];
  debug: boolean;
  enabled: boolean;
  defaultProperties?: Record<string, any>;
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null;
  afterSend?: (event: AnalyticsEvent, results: any[]) => void;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  config: any;
}

export interface AnalyticsEvent {
  type: 'identify' | 'track' | 'page' | 'group' | 'alias';
  userId?: string;
  event?: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// Google Analytics Provider
// ============================================================================

export class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'Google Analytics';
  enabled = false;
  private measurementId?: string;
  private gtag?: any;

  async initialize(config: { measurementId: string }): Promise<void> {
    if (!config.measurementId) {
      throw new Error('Google Analytics measurement ID is required');
    }

    this.measurementId = config.measurementId;

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    this.gtag = function() {
      (window as any).dataLayer.push(arguments);
    };
    this.gtag('js', new Date());
    this.gtag('config', config.measurementId);

    this.enabled = true;
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('set', {
      user_id: userId,
      user_properties: traits,
    });
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('event', event, properties);
  }

  page(name?: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('event', 'page_view', {
      page_title: name || document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...properties,
    });
  }

  group(groupId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('set', {
      group_id: groupId,
      group_properties: traits,
    });
  }

  alias(userId: string, previousId?: string): void {
    // Not supported in Google Analytics
  }

  reset(): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('set', { user_id: null });
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('set', { user_properties: properties });
  }

  incrementUserProperty(property: string, value: number = 1): void {
    // Not directly supported in Google Analytics
    this.track('property_increment', { property, value });
  }

  setGroupProperties(groupId: string, properties: Record<string, any>): void {
    this.group(groupId, properties);
  }

  trackRevenue(amount: number, properties?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('event', 'purchase', {
      value: amount,
      currency: properties?.currency || 'USD',
      ...properties,
    });
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    if (!this.enabled || !this.gtag) return;

    this.gtag('event', 'exception', {
      description: error.message,
      fatal: false,
      ...properties,
    });
  }

  async flush(): Promise<void> {
    // Google Analytics sends events automatically
  }
}

// ============================================================================
// Mixpanel Provider
// ============================================================================

export class MixpanelProvider implements AnalyticsProvider {
  name = 'Mixpanel';
  enabled = false;
  private mixpanel?: any;

  async initialize(config: { token: string; config?: any }): Promise<void> {
    if (!config.token) {
      throw new Error('Mixpanel token is required');
    }

    // Load Mixpanel script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    // Initialize Mixpanel
    this.mixpanel = (window as any).mixpanel;
    this.mixpanel.init(config.token, config.config || {});

    this.enabled = true;
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.identify(userId);
    if (traits) {
      this.mixpanel.people.set(traits);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.track(event, properties);
  }

  page(name?: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.track('Page View', {
      page: name || document.title,
      url: window.location.href,
      path: window.location.pathname,
      ...properties,
    });
  }

  group(groupId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.set_group('company', groupId);
    if (traits) {
      this.mixpanel.get_group('company', groupId).set(traits);
    }
  }

  alias(userId: string, previousId?: string): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.alias(userId, previousId);
  }

  reset(): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.reset();
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.people.set(properties);
  }

  incrementUserProperty(property: string, value: number = 1): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.people.increment(property, value);
  }

  setGroupProperties(groupId: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.get_group('company', groupId).set(properties);
  }

  trackRevenue(amount: number, properties?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.people.track_charge(amount, properties);
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    if (!this.enabled || !this.mixpanel) return;

    this.mixpanel.track('Error', {
      error_message: error.message,
      error_stack: error.stack,
      ...properties,
    });
  }

  async flush(): Promise<void> {
    // Mixpanel sends events automatically
  }
}

// ============================================================================
// Amplitude Provider
// ============================================================================

export class AmplitudeProvider implements AnalyticsProvider {
  name = 'Amplitude';
  enabled = false;
  private amplitude?: any;

  async initialize(config: { apiKey: string; config?: any }): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Amplitude API key is required');
    }

    // Load Amplitude script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://cdn.amplitude.com/libs/amplitude-8.21.8-min.gz.js';
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    // Initialize Amplitude
    this.amplitude = (window as any).amplitude;
    this.amplitude.getInstance().init(config.apiKey, null, config.config || {});

    this.enabled = true;
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().setUserId(userId);
    if (traits) {
      this.amplitude.getInstance().setUserProperties(traits);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().logEvent(event, properties);
  }

  page(name?: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().logEvent('Page View', {
      page: name || document.title,
      url: window.location.href,
      path: window.location.pathname,
      ...properties,
    });
  }

  group(groupId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().setGroup('company', groupId);
    if (traits) {
      this.amplitude.getInstance().groupIdentify('company', groupId, traits);
    }
  }

  alias(userId: string, previousId?: string): void {
    // Not directly supported in Amplitude
    this.identify(userId);
  }

  reset(): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().setUserId(null);
    this.amplitude.getInstance().regenerateDeviceId();
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().setUserProperties(properties);
  }

  incrementUserProperty(property: string, value: number = 1): void {
    if (!this.enabled || !this.amplitude) return;

    const identify = new this.amplitude.Identify().add(property, value);
    this.amplitude.getInstance().identify(identify);
  }

  setGroupProperties(groupId: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().groupIdentify('company', groupId, properties);
  }

  trackRevenue(amount: number, properties?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    const revenue = new this.amplitude.Revenue()
      .setPrice(amount)
      .setQuantity(1);

    if (properties?.productId) {
      revenue.setProductId(properties.productId);
    }

    this.amplitude.getInstance().logRevenueV2(revenue);
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    if (!this.enabled || !this.amplitude) return;

    this.amplitude.getInstance().logEvent('Error', {
      error_message: error.message,
      error_stack: error.stack,
      ...properties,
    });
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.amplitude) return;

    return new Promise((resolve) => {
      this.amplitude.getInstance().uploadEvents(resolve);
    });
  }
}

// ============================================================================
// PostHog Provider
// ============================================================================

export class PostHogProvider implements AnalyticsProvider {
  name = 'PostHog';
  enabled = false;
  private posthog?: any;

  async initialize(config: { apiKey: string; apiHost?: string }): Promise<void> {
    if (!config.apiKey) {
      throw new Error('PostHog API key is required');
    }

    // Load PostHog script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://app.posthog.com/static/array.js';
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    // Initialize PostHog
    this.posthog = (window as any).posthog;
    this.posthog.init(config.apiKey, {
      api_host: config.apiHost || 'https://app.posthog.com',
    });

    this.enabled = true;
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.identify(userId, traits);
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.capture(event, properties);
  }

  page(name?: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.capture('$pageview', {
      $current_url: window.location.href,
      $host: window.location.host,
      $pathname: window.location.pathname,
      title: name || document.title,
      ...properties,
    });
  }

  group(groupId: string, traits?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.group('company', groupId, traits);
  }

  alias(userId: string, previousId?: string): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.alias(userId, previousId);
  }

  reset(): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.reset();
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.people.set(properties);
  }

  incrementUserProperty(property: string, value: number = 1): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.people.increment(property, value);
  }

  setGroupProperties(groupId: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.group('company', groupId, properties);
  }

  trackRevenue(amount: number, properties?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.capture('Revenue', {
      amount,
      currency: properties?.currency || 'USD',
      ...properties,
    });
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    if (!this.enabled || !this.posthog) return;

    this.posthog.capture('$exception', {
      $exception_message: error.message,
      $exception_stack_trace: error.stack,
      ...properties,
    });
  }

  async flush(): Promise<void> {
    // PostHog sends events automatically
  }
}

// ============================================================================
// Analytics Manager
// ============================================================================

export class AnalyticsManager {
  private providers: Map<string, AnalyticsProvider> = new Map();
  private config: AnalyticsConfig;
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  /**
   * Initialize all configured providers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;

      try {
        const provider = this.createProvider(providerConfig.name);
        if (provider) {
          await provider.initialize(providerConfig.config);
          this.providers.set(providerConfig.name, provider);

          if (this.config.debug) {
            console.log(`[Analytics] Initialized provider: ${providerConfig.name}`);
          }
        }
      } catch (error) {
        console.error(`Failed to initialize analytics provider ${providerConfig.name}:`, error);
      }
    }

    // Process queued events
    this.processQueue();

    this.isInitialized = true;
  }

  /**
   * Create provider instance
   */
  private createProvider(name: string): AnalyticsProvider | null {
    switch (name.toLowerCase()) {
      case 'google':
      case 'google analytics':
        return new GoogleAnalyticsProvider();
      case 'mixpanel':
        return new MixpanelProvider();
      case 'amplitude':
        return new AmplitudeProvider();
      case 'posthog':
        return new PostHogProvider();
      default:
        return null;
    }
  }

  /**
   * Execute method on all providers
   */
  private execute(method: string, ...args: any[]): void {
    if (!this.config.enabled) return;

    const event: AnalyticsEvent = {
      type: method as any,
      timestamp: Date.now(),
    };

    // Add event data based on method
    switch (method) {
      case 'identify':
        event.userId = args[0];
        event.properties = args[1];
        break;
      case 'track':
        event.event = args[0];
        event.properties = args[1];
        break;
      case 'page':
        event.event = args[0] || 'Page View';
        event.properties = args[1];
        break;
    }

    // Apply beforeSend hook
    const processedEvent = this.config.beforeSend ? this.config.beforeSend(event) : event;
    if (!processedEvent) return;

    // Queue if not initialized
    if (!this.isInitialized) {
      this.eventQueue.push(processedEvent);
      return;
    }

    // Execute on all providers
    const results: any[] = [];
    for (const provider of this.providers.values()) {
      try {
        (provider as any)[method](...args);
        results.push({ provider: provider.name, success: true });
      } catch (error) {
        results.push({ provider: provider.name, success: false, error });

        if (this.config.debug) {
          console.error(`[Analytics] Error in provider ${provider.name}:`, error);
        }
      }
    }

    // Apply afterSend hook
    if (this.config.afterSend) {
      this.config.afterSend(processedEvent, results);
    }

    if (this.config.debug) {
      console.log(`[Analytics] ${method}:`, args, results);
    }
  }

  /**
   * Process queued events
   */
  private processQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        switch (event.type) {
          case 'identify':
            this.identify(event.userId!, event.properties);
            break;
          case 'track':
            this.track(event.event!, event.properties);
            break;
          case 'page':
            this.page(event.event, event.properties);
            break;
        }
      }
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  identify(userId: string, traits?: Record<string, any>): void {
    const mergedTraits = { ...this.config.defaultProperties, ...traits };
    this.execute('identify', userId, mergedTraits);
  }

  track(event: string, properties?: Record<string, any>): void {
    const mergedProperties = { ...this.config.defaultProperties, ...properties };
    this.execute('track', event, mergedProperties);
  }

  page(name?: string, properties?: Record<string, any>): void {
    const mergedProperties = { ...this.config.defaultProperties, ...properties };
    this.execute('page', name, mergedProperties);
  }

  group(groupId: string, traits?: Record<string, any>): void {
    this.execute('group', groupId, traits);
  }

  alias(userId: string, previousId?: string): void {
    this.execute('alias', userId, previousId);
  }

  reset(): void {
    this.execute('reset');
  }

  setUserProperties(properties: Record<string, any>): void {
    this.execute('setUserProperties', properties);
  }

  incrementUserProperty(property: string, value?: number): void {
    this.execute('incrementUserProperty', property, value);
  }

  setGroupProperties(groupId: string, properties: Record<string, any>): void {
    this.execute('setGroupProperties', groupId, properties);
  }

  trackRevenue(amount: number, properties?: Record<string, any>): void {
    this.execute('trackRevenue', amount, properties);
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    this.execute('trackError', error, properties);
  }

  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const provider of this.providers.values()) {
      promises.push(provider.flush());
    }

    await Promise.all(promises);
  }

  /**
   * Add a custom provider
   */
  addProvider(name: string, provider: AnalyticsProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Remove a provider
   */
  removeProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Get all providers
   */
  getProviders(): AnalyticsProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(name: string): boolean {
    return this.providers.has(name);
  }
}

// ============================================================================
// Default Analytics Instance
// ============================================================================

export const analytics = new AnalyticsManager({
  providers: [
    {
      name: 'Google Analytics',
      enabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      config: {
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      },
    },
    {
      name: 'Mixpanel',
      enabled: !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      config: {
        token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      },
    },
    {
      name: 'Amplitude',
      enabled: !!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
      config: {
        apiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
      },
    },
    {
      name: 'PostHog',
      enabled: !!process.env.NEXT_PUBLIC_POSTHOG_API_KEY,
      config: {
        apiKey: process.env.NEXT_PUBLIC_POSTHOG_API_KEY,
        apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      },
    },
  ],
  debug: process.env.NODE_ENV === 'development',
  enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
});