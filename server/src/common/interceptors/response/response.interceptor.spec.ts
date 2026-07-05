import { ResponseInterceptor } from './response.interceptor';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let mockExecutionContext: any;
  let mockCallHandler: any;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ url: '/test-route' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    };
    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should format standard payload', (done) => {
    const rawData = { foo: 'bar' };
    mockCallHandler.handle.mockReturnValue(of(rawData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          statusCode: 200,
          path: '/test-route',
          data: rawData,
        }),
      );
      done();
    });
  });

  it('should format paginated payload correctly', (done) => {
    const rawPaginated = {
      data: [{ id: 1 }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mockCallHandler.handle.mockReturnValue(of(rawPaginated));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          statusCode: 200,
          path: '/test-route',
          data: rawPaginated.data,
          meta: rawPaginated.meta,
        }),
      );
      done();
    });
  });
});
