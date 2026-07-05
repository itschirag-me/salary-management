import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  path: string;
  timestamp: string;
  data: T;
  meta?: Record<string, unknown>;
}

// Services can return { data, meta } to surface pagination; otherwise the
// whole return value becomes `data` and `meta` is omitted.
interface Paginated<T> {
  data: T;
  meta: Record<string, unknown>;
}

function isPaginated<T>(value: unknown): value is Paginated<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        const base = {
          success: true as const,
          statusCode: response.statusCode,
          path: request.url,
          timestamp: new Date().toISOString(),
        };

        if (isPaginated<T>(payload)) {
          return { ...base, data: payload.data, meta: payload.meta };
        }

        return { ...base, data: payload };
      }),
    );
  }
}
