import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: ContentSecurityPolicyConfig | string;
  strictTransportSecurity?: StrictTransportSecurityConfig | string;
  xContentTypeOptions?: string;
  xFrameOptions?: string;
  xXSSProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: PermissionsPolicyConfig | string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
  reportTo?: ReportToConfig[];
  nel?: NetworkErrorLoggingConfig;
}

/**
 * Content Security Policy configuration
 */
export interface ContentSecurityPolicyConfig {
  directives: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    fontSrc?: string[];
    connectSrc?: string[];
    mediaSrc?: string[];
    objectSrc?: string[];
    frameSrc?: string[];
    workerSrc?: string[];
    childSrc?: string[];
    formAction?: string[];
    frameAncestors?: string[];
    baseUri?: string[];
    manifestSrc?: string[];
    upgradeInsecureRequests?: boolean;
    blockAllMixedContent?: boolean;
    reportUri?: string;
    reportTo?: string;
  };
  reportOnly?: boolean;
}

/**
 * Strict Transport Security configuration
 */
export interface StrictTransportSecurityConfig {
  maxAge: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

/**
 * Permissions Policy configuration
 */
export interface PermissionsPolicyConfig {
  directives: {
    accelerometer?: string[];
    ambientLightSensor?: string[];
    autoplay?: string[];
    battery?: string[];
    camera?: string[];
    displayCapture?: string[];
    documentDomain?: string[];
    encryptedMedia?: string[];
    executionWhileNotRendered?: string[];
    executionWhileOutOfViewport?: string[];
    fullscreen?: string[];
    geolocation?: string[];
    gyroscope?: string[];
    layoutAnimations?: string[];
    legacyImageFormats?: string[];
    magnetometer?: string[];
    microphone?: string[];
    midi?: string[];
    navigationOverride?: string[];
    oversizedImages?: string[];
    payment?: string[];
    pictureInPicture?: string[];
    publicKeyCredentialsGet?: string[];
    speakerSelection?: string[];
    syncXhr?: string[];
    unoptimizedImages?: string[];
    unoptimizedLosslessImages?: string[];
    unoptimizedLossyImages?: string[];
    unsizedMedia?: string[];
    usb?: string[];
    verticalScroll?: string[];
    wakeLock?: string[];
    webShare?: string[];
    xrSpatialTracking?: string[];
  };
}

/**
 * Report-To configuration
 */
export interface ReportToConfig {
  group: string;
  maxAge: number;
  endpoints: Array<{
    url: string;
    priority?: number;
    weight?: number;
  }>;
  includeSubdomains?: boolean;
}

/**
 * Network Error Logging configuration
 */
export interface NetworkErrorLoggingConfig {
  reportTo: string;
  maxAge: number;
  includeSubdomains?: boolean;
  successFraction?: number;
  failureFraction?: number;
}

/**
 * Security Headers Service
 */
export class SecurityHeaders {
  private config: SecurityHeadersConfig;

  constructor(config?: SecurityHeadersConfig) {
    this.config = config || this.getDefaultConfig();
  }

  /**
   * Get default security headers configuration
   */
  private getDefaultConfig(): SecurityHeadersConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Remove in production if possible
            "'unsafe-eval'", // Remove in production if possible
            'https://*.clerk.accounts.dev',
            'https://challenges.cloudflare.com',
            isDevelopment && "'unsafe-eval'",
          ].filter(Boolean) as string[],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for some UI libraries
            'https://fonts.googleapis.com',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://*.clerk.accounts.dev',
            'https://img.clerk.com',
          ],
          fontSrc: [
            "'self'",
            'data:',
            'https://fonts.gstatic.com',
          ],
          connectSrc: [
            "'self'",
            'https://*.clerk.accounts.dev',
            'wss://*.clerk.accounts.dev',
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
            isDevelopment && 'ws://localhost:*',
          ].filter(Boolean) as string[],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: [
            "'self'",
            'https://*.clerk.accounts.dev',
          ],
          workerSrc: ["'self'", 'blob:'],
          childSrc: ["'self'", 'blob:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: !isDevelopment,
          blockAllMixedContent: !isDevelopment,
        },
        reportOnly: isDevelopment,
      },
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'SAMEORIGIN',
      xXSSProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        directives: {
          camera: [],
          microphone: [],
          geolocation: [],
          payment: ["'self'"],
          usb: [],
          magnetometer: [],
          gyroscope: [],
          accelerometer: [],
        },
      },
      crossOriginEmbedderPolicy: 'require-corp',
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
    };
  }

  /**
   * Build CSP header string
   */
  private buildCSP(config: ContentSecurityPolicyConfig): string {
    const directives: string[] = [];

    for (const [key, value] of Object.entries(config.directives)) {
      if (value === undefined) continue;

      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();

      if (typeof value === 'boolean') {
        if (value) {
          directives.push(directive);
        }
      } else if (Array.isArray(value)) {
        directives.push(`${directive} ${value.join(' ')}`);
      } else {
        directives.push(`${directive} ${value}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Build HSTS header string
   */
  private buildHSTS(config: StrictTransportSecurityConfig): string {
    const parts = [`max-age=${config.maxAge}`];

    if (config.includeSubDomains) {
      parts.push('includeSubDomains');
    }

    if (config.preload) {
      parts.push('preload');
    }

    return parts.join('; ');
  }

  /**
   * Build Permissions Policy header string
   */
  private buildPermissionsPolicy(config: PermissionsPolicyConfig): string {
    const policies: string[] = [];

    for (const [key, value] of Object.entries(config.directives)) {
      if (value === undefined) continue;

      const policy = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const sources = value.length > 0 ? value.join(' ') : '()';

      policies.push(`${policy}=${sources}`);
    }

    return policies.join(', ');
  }

  /**
   * Build Report-To header string
   */
  private buildReportTo(configs: ReportToConfig[]): string {
    return JSON.stringify(configs);
  }

  /**
   * Build NEL header string
   */
  private buildNEL(config: NetworkErrorLoggingConfig): string {
    return JSON.stringify({
      report_to: config.reportTo,
      max_age: config.maxAge,
      include_subdomains: config.includeSubdomains,
      success_fraction: config.successFraction,
      failure_fraction: config.failureFraction,
    });
  }

  /**
   * Get all security headers
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (this.config.contentSecurityPolicy) {
      if (typeof this.config.contentSecurityPolicy === 'string') {
        headers['Content-Security-Policy'] = this.config.contentSecurityPolicy;
      } else {
        const csp = this.buildCSP(this.config.contentSecurityPolicy);
        const headerName = this.config.contentSecurityPolicy.reportOnly ?
          'Content-Security-Policy-Report-Only' :
          'Content-Security-Policy';
        headers[headerName] = csp;
      }
    }

    // Strict Transport Security
    if (this.config.strictTransportSecurity) {
      if (typeof this.config.strictTransportSecurity === 'string') {
        headers['Strict-Transport-Security'] = this.config.strictTransportSecurity;
      } else {
        headers['Strict-Transport-Security'] = this.buildHSTS(
          this.config.strictTransportSecurity
        );
      }
    }

    // X-Content-Type-Options
    if (this.config.xContentTypeOptions) {
      headers['X-Content-Type-Options'] = this.config.xContentTypeOptions;
    }

    // X-Frame-Options
    if (this.config.xFrameOptions) {
      headers['X-Frame-Options'] = this.config.xFrameOptions;
    }

    // X-XSS-Protection
    if (this.config.xXSSProtection) {
      headers['X-XSS-Protection'] = this.config.xXSSProtection;
    }

    // Referrer-Policy
    if (this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    // Permissions-Policy
    if (this.config.permissionsPolicy) {
      if (typeof this.config.permissionsPolicy === 'string') {
        headers['Permissions-Policy'] = this.config.permissionsPolicy;
      } else {
        headers['Permissions-Policy'] = this.buildPermissionsPolicy(
          this.config.permissionsPolicy
        );
      }
    }

    // Cross-Origin policies
    if (this.config.crossOriginEmbedderPolicy) {
      headers['Cross-Origin-Embedder-Policy'] = this.config.crossOriginEmbedderPolicy;
    }

    if (this.config.crossOriginOpenerPolicy) {
      headers['Cross-Origin-Opener-Policy'] = this.config.crossOriginOpenerPolicy;
    }

    if (this.config.crossOriginResourcePolicy) {
      headers['Cross-Origin-Resource-Policy'] = this.config.crossOriginResourcePolicy;
    }

    // Report-To
    if (this.config.reportTo) {
      headers['Report-To'] = this.buildReportTo(this.config.reportTo);
    }

    // NEL
    if (this.config.nel) {
      headers['NEL'] = this.buildNEL(this.config.nel);
    }

    return headers;
  }

  /**
   * Apply headers to response
   */
  applyToResponse(response: Response | NextResponse): void {
    const headers = this.getHeaders();

    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
  }

  /**
   * Next.js middleware helper
   */
  middleware() {
    return (request: NextRequest) => {
      const response = NextResponse.next();
      this.applyToResponse(response);
      return response;
    };
  }

  /**
   * Express middleware helper
   */
  expressMiddleware() {
    return (_req: any, res: any, next: any) => {
      const headers = this.getHeaders();

      for (const [name, value] of Object.entries(headers)) {
        res.setHeader(name, value);
      }

      next();
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get nonce for inline scripts
   */
  static generateNonce(): string {
    return Buffer.from(crypto.randomBytes(16)).toString('base64');
  }
}

/**
 * Create production-ready security headers
 */
export function createProductionHeaders(): SecurityHeaders {
  return new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'strict-dynamic'", // Use with nonces
          'https://*.clerk.accounts.dev',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Consider using nonces instead
          'https://fonts.googleapis.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://*.clerk.accounts.dev',
          'https://img.clerk.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.clerk.accounts.dev',
          'wss://*.clerk.accounts.dev',
          process.env.NEXT_PUBLIC_API_URL || '',
        ].filter(Boolean),
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", 'https://*.clerk.accounts.dev'],
        workerSrc: ["'self'"],
        childSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: true,
        blockAllMixedContent: true,
        reportUri: process.env.CSP_REPORT_URI,
      },
      reportOnly: false,
    },
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      directives: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        displayCapture: [],
        encryptedMedia: [],
        fullscreen: ["'self'"],
        pictureInPicture: [],
        syncXhr: [],
      },
    },
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin-allow-popups',
    crossOriginResourcePolicy: 'cross-origin',
  });
}

/**
 * Create development security headers (more permissive)
 */
export function createDevelopmentHeaders(): SecurityHeaders {
  return new SecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://*.clerk.accounts.dev',
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'ws://localhost:*',
          'http://localhost:*',
          'https://*.clerk.accounts.dev',
          'wss://*.clerk.accounts.dev',
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'", 'https://*.clerk.accounts.dev'],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'", 'blob:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
      },
      reportOnly: true,
    },
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'SAMEORIGIN',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
  });
}

// Export singleton instance based on environment
export const securityHeaders = process.env.NODE_ENV === 'production' ?
  createProductionHeaders() :
  createDevelopmentHeaders();

// For crypto import
import crypto from 'crypto';