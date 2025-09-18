import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxAttempts: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(
    private eventEmitter: EventEmitter2,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeout: config?.resetTimeout ?? 60000, // 1 minute
      monitoringPeriod: config?.monitoringPeriod ?? 10000, // 10 seconds
      halfOpenMaxAttempts: config?.halfOpenMaxAttempts ?? 3,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit breaker should be open
    if (this.state === CircuitBreakerState.OPEN) {
      const error = new Error('Circuit breaker is OPEN - Database unavailable');
      this.logger.error(error.message);
      throw error;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      this.logger.log(
        `Circuit breaker HALF_OPEN - Success ${this.successCount}/${this.config.halfOpenMaxAttempts}`,
      );

      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.close();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on successful operation
      this.failureCount = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.logger.warn(
        'Circuit breaker HALF_OPEN - Failure detected, opening circuit',
      );
      this.open();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount++;
      this.logger.warn(
        `Circuit breaker CLOSED - Failure ${this.failureCount}/${this.config.failureThreshold}`,
      );

      if (this.failureCount >= this.config.failureThreshold) {
        this.open();
      }
    }

    // Emit failure event
    this.eventEmitter.emit('circuit-breaker.failure', {
      state: this.state,
      failureCount: this.failureCount,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.logger.error(
      `Circuit breaker is now OPEN - Will attempt recovery in ${this.config.resetTimeout}ms`,
    );

    // Clear any existing timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    // Set timer to transition to HALF_OPEN
    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.config.resetTimeout);

    // Emit state change event
    this.eventEmitter.emit('circuit-breaker.state-change', {
      previousState: this.state,
      newState: CircuitBreakerState.OPEN,
      failureCount: this.failureCount,
    });
  }

  private halfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.logger.log(
      'Circuit breaker is now HALF_OPEN - Testing database connection',
    );

    // Emit state change event
    this.eventEmitter.emit('circuit-breaker.state-change', {
      previousState: CircuitBreakerState.OPEN,
      newState: CircuitBreakerState.HALF_OPEN,
    });
  }

  private close(): void {
    const previousState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;

    this.logger.log(
      'Circuit breaker is now CLOSED - Database connection restored',
    );

    // Clear reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    // Emit state change event
    this.eventEmitter.emit('circuit-breaker.state-change', {
      previousState,
      newState: CircuitBreakerState.CLOSED,
    });
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: Date | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.close();
  }

  forceOpen(): void {
    this.open();
  }

  forceClose(): void {
    this.close();
  }
}
