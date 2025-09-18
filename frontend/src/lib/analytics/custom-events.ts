/**
 * Production-ready Custom Event Tracking System
 *
 * Flexible event tracking with:
 * - Custom event definitions
 * - Event validation
 * - Event batching
 * - Event enrichment
 * - Cross-platform support
 */

import { v4 as uuidv4 } from 'uuid';
import { userAnalytics } from './user-analytics';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CustomEvent {
  id: string;
  name: string;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  properties: Record<string, any>;
  metadata: EventMetadata;
  context: EventContext;
}

export enum EventCategory {
  USER_INTERACTION = 'user_interaction',
  NAVIGATION = 'navigation',
  FORM = 'form',
  SEARCH = 'search',
  TRANSACTION = 'transaction',
  CONTENT = 'content',
  SOCIAL = 'social',
  VIDEO = 'video',
  DOWNLOAD = 'download',
  ENGAGEMENT = 'engagement',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  CUSTOM = 'custom',
}

export interface EventMetadata {
  version: string;
  source: 'web' | 'mobile' | 'server';
  sdk: string;
  priority: 'low' | 'normal' | 'high';
  retry: boolean;
  retryCount: number;
  batchId?: string;
}

export interface EventContext {
  userId?: string;
  sessionId?: string;
  page?: PageContext;
  device?: DeviceContext;
  campaign?: CampaignContext;
  custom?: Record<string, any>;
}

export interface PageContext {
  url: string;
  path: string;
  title: string;
  referrer: string;
  search?: string;
  hash?: string;
}

export interface DeviceContext {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  viewport: { width: number; height: number };
  screenResolution: { width: number; height: number };
  language: string;
  timezone: string;
}

export interface CampaignContext {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface EventDefinition {
  name: string;
  category: EventCategory;
  schema?: EventSchema;
  required?: string[];
  enrichers?: EventEnricher[];
  validators?: EventValidator[];
}

export interface EventSchema {
  properties: Record<string, PropertySchema>;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  default?: any;
}

export type EventEnricher = (event: CustomEvent) => CustomEvent;
export type EventValidator = (event: CustomEvent) => boolean | string;

export interface EventBatch {
  id: string;
  events: CustomEvent[];
  createdAt: number;
  scheduledAt: number;
  attempts: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface TrackingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  batchInterval: number; // ms
  maxRetries: number;
  timeout: number; // ms
  enrichers: EventEnricher[];
  validators: EventValidator[];
  debug: boolean;
}

// ============================================================================
// Custom Event Tracker Class
// ============================================================================

export class CustomEventTracker {
  private config: TrackingConfig;
  private definitions: Map<string, EventDefinition> = new Map();
  private eventQueue: CustomEvent[] = [];
  private batches: Map<string, EventBatch> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = {
      enabled: true,
      batchSize: 50,
      batchInterval: 5000, // 5 seconds
      maxRetries: 3,
      timeout: 10000, // 10 seconds
      enrichers: [],
      validators: [],
      debug: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.initializeDefaultDefinitions();
  }

  /**
   * Initialize default event definitions
   */
  private initializeDefaultDefinitions(): void {
    // User interaction events
    this.defineEvent({
      name: 'button_click',
      category: EventCategory.USER_INTERACTION,
      schema: {
        properties: {
          buttonText: { type: 'string', required: true },
          buttonId: { type: 'string' },
          buttonClass: { type: 'string' },
        },
      },
    });

    this.defineEvent({
      name: 'link_click',
      category: EventCategory.USER_INTERACTION,
      schema: {
        properties: {
          linkText: { type: 'string', required: true },
          linkUrl: { type: 'string', required: true },
          isExternal: { type: 'boolean' },
        },
      },
    });

    // Form events
    this.defineEvent({
      name: 'form_submit',
      category: EventCategory.FORM,
      schema: {
        properties: {
          formId: { type: 'string', required: true },
          formName: { type: 'string' },
          fields: { type: 'object' },
          validationErrors: { type: 'array' },
        },
      },
    });

    this.defineEvent({
      name: 'form_error',
      category: EventCategory.FORM,
      schema: {
        properties: {
          formId: { type: 'string', required: true },
          fieldName: { type: 'string', required: true },
          errorMessage: { type: 'string', required: true },
        },
      },
    });

    // Search events
    this.defineEvent({
      name: 'search',
      category: EventCategory.SEARCH,
      schema: {
        properties: {
          query: { type: 'string', required: true },
          resultsCount: { type: 'number' },
          filters: { type: 'object' },
        },
      },
    });

    // Transaction events
    this.defineEvent({
      name: 'purchase',
      category: EventCategory.TRANSACTION,
      schema: {
        properties: {
          transactionId: { type: 'string', required: true },
          amount: { type: 'number', required: true },
          currency: { type: 'string', required: true },
          items: { type: 'array' },
        },
      },
    });

    // Content events
    this.defineEvent({
      name: 'content_view',
      category: EventCategory.CONTENT,
      schema: {
        properties: {
          contentId: { type: 'string', required: true },
          contentType: { type: 'string', required: true },
          contentTitle: { type: 'string' },
        },
      },
    });

    this.defineEvent({
      name: 'content_share',
      category: EventCategory.SOCIAL,
      schema: {
        properties: {
          contentId: { type: 'string', required: true },
          shareMethod: { type: 'string', required: true },
          platform: { type: 'string' },
        },
      },
    });

    // Video events
    this.defineEvent({
      name: 'video_play',
      category: EventCategory.VIDEO,
      schema: {
        properties: {
          videoId: { type: 'string', required: true },
          videoTitle: { type: 'string' },
          duration: { type: 'number' },
        },
      },
    });

    this.defineEvent({
      name: 'video_complete',
      category: EventCategory.VIDEO,
      schema: {
        properties: {
          videoId: { type: 'string', required: true },
          watchTime: { type: 'number', required: true },
          completionRate: { type: 'number', required: true },
        },
      },
    });

    // Engagement events
    this.defineEvent({
      name: 'scroll_depth',
      category: EventCategory.ENGAGEMENT,
      schema: {
        properties: {
          depth: { type: 'number', required: true, min: 0, max: 100 },
          timeOnPage: { type: 'number' },
        },
      },
    });

    this.defineEvent({
      name: 'time_on_page',
      category: EventCategory.ENGAGEMENT,
      schema: {
        properties: {
          duration: { type: 'number', required: true },
          engaged: { type: 'boolean' },
        },
      },
    });
  }

  /**
   * Initialize tracker
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Start batch processing
    this.startBatchProcessing();

    // Set up page unload handler
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }

    this.isInitialized = true;
  }

  /**
   * Define custom event
   */
  defineEvent(definition: EventDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /**
   * Track custom event
   */
  track(
    eventName: string,
    properties: Record<string, any> = {},
    options: {
      category?: EventCategory;
      action?: string;
      label?: string;
      value?: number;
      immediate?: boolean;
    } = {}
  ): string {
    if (!this.config.enabled) return '';

    // Get event definition
    const definition = this.definitions.get(eventName);
    const category = options.category || definition?.category || EventCategory.CUSTOM;

    // Create event
    const event: CustomEvent = {
      id: uuidv4(),
      name: eventName,
      category,
      action: options.action || eventName,
      label: options.label,
      value: options.value,
      timestamp: Date.now(),
      properties,
      metadata: {
        version: '1.0.0',
        source: 'web',
        sdk: 'custom-tracker',
        priority: 'normal',
        retry: true,
        retryCount: 0,
      },
      context: this.getEventContext(),
    };

    // Validate event
    const validationResult = this.validateEvent(event, definition);
    if (validationResult !== true) {
      if (this.config.debug) {
        console.error(`Event validation failed: ${validationResult}`);
      }
      return '';
    }

    // Enrich event
    const enrichedEvent = this.enrichEvent(event, definition);

    // Add to queue or send immediately
    if (options.immediate) {
      this.sendEvents([enrichedEvent]);
    } else {
      this.eventQueue.push(enrichedEvent);

      // Check if should send batch
      if (this.eventQueue.length >= this.config.batchSize) {
        this.sendBatch();
      }
    }

    // Also track in user analytics
    userAnalytics.track(eventName, {
      category: category.toString(),
      action: options.action,
      label: options.label,
      value: options.value,
      properties,
    });

    if (this.config.debug) {
      console.log('[CustomEvents] Tracked:', enrichedEvent);
    }

    return event.id;
  }

  /**
   * Get event context
   */
  private getEventContext(): EventContext {
    const context: EventContext = {
      userId: localStorage.getItem('userId') || undefined,
      sessionId: sessionStorage.getItem('sessionId') || undefined,
    };

    // Page context
    if (typeof window !== 'undefined') {
      context.page = {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        search: window.location.search,
        hash: window.location.hash,
      };

      // Device context
      context.device = {
        type: this.getDeviceType(),
        os: this.getOS(),
        browser: this.getBrowser(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screenResolution: {
          width: screen.width,
          height: screen.height,
        },
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Campaign context (from URL parameters)
    const urlParams = new URLSearchParams(window.location.search);
    const campaign: CampaignContext = {};

    if (urlParams.get('utm_source')) campaign.source = urlParams.get('utm_source')!;
    if (urlParams.get('utm_medium')) campaign.medium = urlParams.get('utm_medium')!;
    if (urlParams.get('utm_campaign')) campaign.campaign = urlParams.get('utm_campaign')!;
    if (urlParams.get('utm_term')) campaign.term = urlParams.get('utm_term')!;
    if (urlParams.get('utm_content')) campaign.content = urlParams.get('utm_content')!;

    if (Object.keys(campaign).length > 0) {
      context.campaign = campaign;
    }

    return context;
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;

    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }

    if (/iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Get operating system
   */
  private getOS(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;

    if (platform.indexOf('Win') > -1) return 'Windows';
    if (platform.indexOf('Mac') > -1) return 'macOS';
    if (platform.indexOf('Linux') > -1) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/.test(userAgent)) return 'iOS';

    return 'Unknown';
  }

  /**
   * Get browser
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
    if (userAgent.indexOf('Safari') > -1) return 'Safari';
    if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
    if (userAgent.indexOf('Edge') > -1) return 'Edge';

    return 'Unknown';
  }

  /**
   * Validate event
   */
  private validateEvent(
    event: CustomEvent,
    definition?: EventDefinition
  ): boolean | string {
    // Run global validators
    for (const validator of this.config.validators) {
      const result = validator(event);
      if (result !== true) {
        return typeof result === 'string' ? result : 'Validation failed';
      }
    }

    // Run definition validators
    if (definition?.validators) {
      for (const validator of definition.validators) {
        const result = validator(event);
        if (result !== true) {
          return typeof result === 'string' ? result : 'Validation failed';
        }
      }
    }

    // Validate schema
    if (definition?.schema) {
      const schemaResult = this.validateSchema(event.properties, definition.schema);
      if (schemaResult !== true) {
        return schemaResult;
      }
    }

    return true;
  }

  /**
   * Validate schema
   */
  private validateSchema(
    properties: Record<string, any>,
    schema: EventSchema
  ): boolean | string {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = properties[key];

      // Check required
      if (propSchema.required && value === undefined) {
        return `Missing required property: ${key}`;
      }

      if (value !== undefined) {
        // Check type
        if (propSchema.type && typeof value !== propSchema.type) {
          return `Invalid type for ${key}: expected ${propSchema.type}, got ${typeof value}`;
        }

        // Check enum
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          return `Invalid value for ${key}: must be one of ${propSchema.enum.join(', ')}`;
        }

        // Check min/max
        if (propSchema.min !== undefined && value < propSchema.min) {
          return `Value for ${key} is below minimum: ${propSchema.min}`;
        }

        if (propSchema.max !== undefined && value > propSchema.max) {
          return `Value for ${key} is above maximum: ${propSchema.max}`;
        }

        // Check pattern
        if (propSchema.pattern && !propSchema.pattern.test(value)) {
          return `Value for ${key} does not match pattern`;
        }
      }
    }

    return true;
  }

  /**
   * Enrich event
   */
  private enrichEvent(event: CustomEvent, definition?: EventDefinition): CustomEvent {
    let enrichedEvent = { ...event };

    // Apply global enrichers
    for (const enricher of this.config.enrichers) {
      enrichedEvent = enricher(enrichedEvent);
    }

    // Apply definition enrichers
    if (definition?.enrichers) {
      for (const enricher of definition.enrichers) {
        enrichedEvent = enricher(enrichedEvent);
      }
    }

    // Apply default values from schema
    if (definition?.schema) {
      for (const [key, propSchema] of Object.entries(definition.schema.properties)) {
        if (propSchema.default !== undefined && enrichedEvent.properties[key] === undefined) {
          enrichedEvent.properties[key] = propSchema.default;
        }
      }
    }

    return enrichedEvent;
  }

  /**
   * Start batch processing
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.sendBatch();
      }
    }, this.config.batchInterval);
  }

  /**
   * Send batch
   */
  private sendBatch(): void {
    if (this.eventQueue.length === 0) return;

    // Create batch
    const batch: EventBatch = {
      id: uuidv4(),
      events: [...this.eventQueue],
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      attempts: 0,
      status: 'pending',
    };

    // Clear queue
    this.eventQueue = [];

    // Store batch
    this.batches.set(batch.id, batch);

    // Send batch
    this.sendEvents(batch.events, batch.id);
  }

  /**
   * Send events
   */
  private async sendEvents(events: CustomEvent[], batchId?: string): Promise<void> {
    if (!this.config.endpoint) {
      if (this.config.debug) {
        console.log('[CustomEvents] No endpoint configured, events not sent:', events);
      }
      return;
    }

    const batch = batchId ? this.batches.get(batchId) : null;

    if (batch) {
      batch.status = 'sending';
      batch.attempts++;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({ events, batchId }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (batch) {
        batch.status = 'sent';
        this.batches.delete(batch.id);
      }

      if (this.config.debug) {
        console.log('[CustomEvents] Events sent successfully:', events.length);
      }
    } catch (error) {
      if (batch) {
        batch.status = 'failed';

        // Retry logic
        if (batch.attempts < this.config.maxRetries) {
          const delay = Math.pow(2, batch.attempts) * 1000; // Exponential backoff
          setTimeout(() => {
            this.sendEvents(batch.events, batch.id);
          }, delay);
        } else {
          // Max retries reached, discard batch
          this.batches.delete(batch.id);

          if (this.config.debug) {
            console.error('[CustomEvents] Failed to send events after retries:', error);
          }
        }
      }
    }
  }

  /**
   * Flush all pending events
   */
  flush(): void {
    if (this.eventQueue.length > 0) {
      this.sendBatch();
    }
  }

  /**
   * Add global enricher
   */
  addEnricher(enricher: EventEnricher): void {
    this.config.enrichers.push(enricher);
  }

  /**
   * Add global validator
   */
  addValidator(validator: EventValidator): void {
    this.config.validators.push(validator);
  }

  /**
   * Get event definition
   */
  getDefinition(eventName: string): EventDefinition | undefined {
    return this.definitions.get(eventName);
  }

  /**
   * Get all definitions
   */
  getDefinitions(): EventDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.eventQueue = [];
    this.batches.clear();
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.flush();
    this.clear();
    this.isInitialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const customEvents = new CustomEventTracker({
  enabled: process.env.NEXT_PUBLIC_ENABLE_CUSTOM_EVENTS === 'true',
  endpoint: process.env.NEXT_PUBLIC_EVENTS_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_EVENTS_API_KEY,
  debug: process.env.NODE_ENV === 'development',
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track custom event
 */
export function trackCustomEvent(
  eventName: string,
  properties?: Record<string, any>,
  options?: Parameters<CustomEventTracker['track']>[2]
): string {
  return customEvents.track(eventName, properties, options);
}

/**
 * Define custom event
 */
export function defineCustomEvent(definition: EventDefinition): void {
  customEvents.defineEvent(definition);
}

/**
 * Flush events
 */
export function flushEvents(): void {
  customEvents.flush();
}

export default customEvents;