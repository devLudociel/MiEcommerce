/**
 * Fluent Request builder for security tests
 * Simplifies constructing requests with various auth, CSRF, and header configurations
 */

export class RequestBuilder {
  private url: string;
  private method: string;
  private headers: Record<string, string> = {};
  private bodyContent: string | null = null;

  constructor(url: string, method: string = 'GET') {
    this.url = url;
    this.method = method;
  }

  /**
   * Add Bearer token authorization header
   */
  withAuth(token: string): this {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  /**
   * Explicitly set no auth header
   */
  withNoAuth(): this {
    delete this.headers['Authorization'];
    return this;
  }

  /**
   * Add proper CSRF headers (Origin matching Host + Content-Type: application/json)
   */
  withCSRF(host: string = 'localhost:4321'): this {
    this.headers['Origin'] = `http://${host}`;
    this.headers['Host'] = host;
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  /**
   * Set Origin to a malicious domain (for CSRF bypass testing)
   */
  withInvalidOrigin(origin: string = 'https://evil.com'): this {
    this.headers['Origin'] = origin;
    this.headers['Host'] = 'localhost:4321';
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  /**
   * Set Content-Type to form-urlencoded (no custom header - CSRF should block)
   */
  withFormBody(data: string = ''): this {
    this.headers['Origin'] = 'http://localhost:4321';
    this.headers['Host'] = 'localhost:4321';
    this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    this.bodyContent = data;
    return this;
  }

  /**
   * Remove Origin and Referer headers (for CSRF missing origin testing)
   */
  withNoOrigin(): this {
    delete this.headers['Origin'];
    delete this.headers['Referer'];
    this.headers['Host'] = 'localhost:4321';
    this.headers['Content-Type'] = 'application/json';
    return this;
  }

  /**
   * Set JSON body
   */
  withBody(data: unknown): this {
    this.bodyContent = JSON.stringify(data);
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/json';
    }
    return this;
  }

  /**
   * Set raw body string (for malformed JSON testing)
   */
  withRawBody(raw: string): this {
    this.bodyContent = raw;
    return this;
  }

  /**
   * Set arbitrary header
   */
  withHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Add X-Requested-With: XMLHttpRequest header
   */
  withXHR(): this {
    this.headers['X-Requested-With'] = 'XMLHttpRequest';
    return this;
  }

  /**
   * Set X-Forwarded-For header (for IP spoofing tests)
   */
  withIP(ip: string): this {
    this.headers['X-Forwarded-For'] = ip;
    return this;
  }

  /**
   * Add Stripe webhook signature header
   */
  withStripeSignature(signature: string): this {
    this.headers['stripe-signature'] = signature;
    return this;
  }

  /**
   * Build and return the Request object
   */
  build(): Request {
    const init: RequestInit = {
      method: this.method,
      headers: this.headers,
    };

    if (this.bodyContent && this.method !== 'GET' && this.method !== 'HEAD') {
      init.body = this.bodyContent;
    }

    return new Request(this.url, init);
  }
}

/**
 * Convenience factory function
 */
export function buildRequest(url: string, method: string = 'GET'): RequestBuilder {
  return new RequestBuilder(url, method);
}

/**
 * Create a standard authenticated POST request with CSRF headers
 */
export function buildAuthenticatedPost(url: string, token: string, body: unknown): Request {
  return buildRequest(url, 'POST').withAuth(token).withCSRF().withBody(body).build();
}

/**
 * Create an unauthenticated POST request with CSRF headers
 */
export function buildUnauthenticatedPost(url: string, body: unknown): Request {
  return buildRequest(url, 'POST').withCSRF().withBody(body).build();
}
