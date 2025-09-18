import crypto from 'crypto';

/**
 * Request Signing Configuration
 */
export interface SigningConfig {
  secret: string;
  algorithm?: string;
  includeTimestamp?: boolean;
  includeNonce?: boolean;
  maxClockSkew?: number; // Maximum allowed time difference in seconds
}

/**
 * Signed Request Headers
 */
export interface SignedHeaders {
  'X-Signature': string;
  'X-Timestamp'?: string;
  'X-Nonce'?: string;
  'X-Algorithm'?: string;
}

/**
 * Request signature components
 */
interface SignatureComponents {
  method: string;
  url: string;
  timestamp: number;
  nonce: string;
  body: string;
  headers?: Record<string, string>;
}

class RequestSigner {
  private readonly defaultAlgorithm = 'sha256';
  private readonly maxClockSkew = 300; // 5 minutes
  private readonly nonceCache = new Set<string>();
  private readonly nonceCacheMaxSize = 1000;
  private readonly nonceCacheTTL = 600000; // 10 minutes

  constructor() {
    // Clean up nonce cache periodically
    this.startNonceCacheCleanup();
  }

  /**
   * Sign a request
   */
  signRequest(
    method: string,
    url: string,
    body: any,
    config: SigningConfig
  ): SignedHeaders {
    const algorithm = config.algorithm || this.defaultAlgorithm;
    const timestamp = Date.now();
    const nonce = this.generateNonce();

    // Create signature components
    const components: SignatureComponents = {
      method: method.toUpperCase(),
      url: this.normalizeUrl(url),
      timestamp,
      nonce,
      body: this.normalizeBody(body),
    };

    // Generate signature
    const signature = this.generateSignature(components, config.secret, algorithm);

    // Build headers
    const headers: SignedHeaders = {
      'X-Signature': signature,
    };

    if (config.includeTimestamp !== false) {
      headers['X-Timestamp'] = timestamp.toString();
    }

    if (config.includeNonce !== false) {
      headers['X-Nonce'] = nonce;
    }

    if (config.algorithm) {
      headers['X-Algorithm'] = algorithm;
    }

    return headers;
  }

  /**
   * Verify a request signature
   */
  verifySignature(
    method: string,
    url: string,
    body: any,
    headers: Record<string, string>,
    config: SigningConfig
  ): { valid: boolean; reason?: string } {
    const signature = headers['x-signature'] || headers['X-Signature'];
    const timestamp = headers['x-timestamp'] || headers['X-Timestamp'];
    const nonce = headers['x-nonce'] || headers['X-Nonce'];
    const algorithm = headers['x-algorithm'] || headers['X-Algorithm'] || config.algorithm || this.defaultAlgorithm;

    // Check required headers
    if (!signature) {
      return { valid: false, reason: 'Missing signature header' };
    }

    // Verify timestamp if present
    if (timestamp) {
      const requestTime = parseInt(timestamp);
      const currentTime = Date.now();
      const clockSkew = Math.abs(currentTime - requestTime) / 1000;

      if (clockSkew > (config.maxClockSkew || this.maxClockSkew)) {
        return { valid: false, reason: 'Request timestamp too old or too far in future' };
      }
    }

    // Check nonce for replay protection
    if (nonce) {
      if (this.nonceCache.has(nonce)) {
        return { valid: false, reason: 'Nonce already used (possible replay attack)' };
      }
      this.nonceCache.add(nonce);
    }

    // Create signature components
    const components: SignatureComponents = {
      method: method.toUpperCase(),
      url: this.normalizeUrl(url),
      timestamp: timestamp ? parseInt(timestamp) : Date.now(),
      nonce: nonce || '',
      body: this.normalizeBody(body),
    };

    // Generate expected signature
    const expectedSignature = this.generateSignature(components, config.secret, algorithm);

    // Constant-time comparison to prevent timing attacks
    const valid = this.constantTimeCompare(signature, expectedSignature);

    if (!valid) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true };
  }

  /**
   * Generate signature from components
   */
  private generateSignature(
    components: SignatureComponents,
    secret: string,
    algorithm: string
  ): string {
    // Create canonical string
    const canonicalString = this.createCanonicalString(components);

    // Generate HMAC
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(canonicalString);

    // Return base64 encoded signature
    return hmac.digest('base64');
  }

  /**
   * Create canonical string from components
   */
  private createCanonicalString(components: SignatureComponents): string {
    const parts = [
      components.method,
      components.url,
      components.timestamp.toString(),
      components.nonce,
      components.body,
    ];

    // Add headers if present
    if (components.headers) {
      const headerString = Object.entries(components.headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key.toLowerCase()}:${value}`)
        .join('\n');
      parts.push(headerString);
    }

    return parts.join('\n');
  }

  /**
   * Normalize URL for signing
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');

      // Sort query parameters
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();

      Array.from(params.keys())
        .sort()
        .forEach(key => {
          params.getAll(key).forEach(value => {
            sortedParams.append(key, value);
          });
        });

      urlObj.search = sortedParams.toString();

      // Remove default ports
      if (
        (urlObj.protocol === 'http:' && urlObj.port === '80') ||
        (urlObj.protocol === 'https:' && urlObj.port === '443')
      ) {
        urlObj.port = '';
      }

      // Return path and query only for relative URLs
      if (url.startsWith('/')) {
        return urlObj.pathname + urlObj.search;
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Normalize body for signing
   */
  private normalizeBody(body: any): string {
    if (!body) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    // Sort object keys for consistent serialization
    return JSON.stringify(this.sortObjectKeys(body));
  }

  /**
   * Sort object keys recursively
   */
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
          return sorted;
        }, {} as any);
    }

    return obj;
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Start periodic nonce cache cleanup
   */
  private startNonceCacheCleanup(): void {
    setInterval(() => {
      // Keep cache size under control
      if (this.nonceCache.size > this.nonceCacheMaxSize) {
        // Clear oldest entries (simple strategy: clear all)
        // In production, you'd want to track timestamps
        this.nonceCache.clear();
      }
    }, this.nonceCacheTTL);
  }
}

// Create singleton instance
export const requestSigner = new RequestSigner();

// Export class for testing
export { RequestSigner };

/**
 * Express/Next.js middleware for request signature verification
 */
export function createSignatureMiddleware(config: SigningConfig) {
  return (req: any, res: any, next: any) => {
    const result = requestSigner.verifySignature(
      req.method,
      req.url,
      req.body,
      req.headers,
      config
    );

    if (!result.valid) {
      return res.status(401).json({
        error: 'Invalid request signature',
        reason: result.reason,
      });
    }

    next();
  };
}

/**
 * Client-side helper for signed fetch requests
 */
export async function signedFetch(
  url: string,
  options: RequestInit & { signingConfig?: SigningConfig } = {}
): Promise<Response> {
  if (!options.signingConfig) {
    // Regular fetch without signing
    return fetch(url, options);
  }

  const { signingConfig, ...fetchOptions } = options;

  // Sign the request
  const signedHeaders = requestSigner.signRequest(
    fetchOptions.method || 'GET',
    url,
    fetchOptions.body,
    signingConfig
  );

  // Merge signed headers with existing headers
  const headers = new Headers(fetchOptions.headers);
  Object.entries(signedHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Make the request
  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}

/**
 * Axios interceptor for request signing
 */
export function createAxiosSigningInterceptor(config: SigningConfig) {
  return (axiosConfig: any) => {
    const signedHeaders = requestSigner.signRequest(
      axiosConfig.method || 'GET',
      axiosConfig.url || '',
      axiosConfig.data,
      config
    );

    // Add signed headers
    axiosConfig.headers = {
      ...axiosConfig.headers,
      ...signedHeaders,
    };

    return axiosConfig;
  };
}