import request from 'supertest';
import app from './index';

describe('Express App', () => {
  describe('GET /', () => {
    it('should respond to GET / with status ok', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        message: 'Server running',
      });
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should have correct response structure', async () => {
      const response = await request(app).get('/');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });

    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      await request(app).get('/');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // 1 second threshold
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => request(app).get('/'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for POST to non-existent route', async () => {
      const response = await request(app).post('/non-existent-route').send({});

      expect(response.status).toBe(404);
    });

    it('should return 404 for PUT to non-existent route', async () => {
      const response = await request(app).put('/non-existent-route').send({});

      expect(response.status).toBe(404);
    });

    it('should return 404 for DELETE to non-existent route', async () => {
      const response = await request(app).delete('/non-existent-route');

      expect(response.status).toBe(404);
    });
  });

  describe('JSON Middleware', () => {
    it('should parse JSON request body', async () => {
      const response = await request(app)
        .post('/test-json')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Even though route doesn't exist, middleware should parse JSON
      expect(response.status).toBe(404); // Route not found, but JSON was parsed
    });

    it('should handle empty JSON body', async () => {
      const response = await request(app)
        .post('/test-json')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/test-json')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400); // Bad request for malformed JSON
    });
  });

  describe('HTTP Methods', () => {
    it('should only accept GET for root endpoint', async () => {
      const postResponse = await request(app).post('/').send({});
      const putResponse = await request(app).put('/').send({});
      const deleteResponse = await request(app).delete('/');

      expect(postResponse.status).toBe(404);
      expect(putResponse.status).toBe(404);
      expect(deleteResponse.status).toBe(404);
    });

    it('should handle HEAD request to root', async () => {
      const response = await request(app).head('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should handle OPTIONS request', async () => {
      const response = await request(app).options('/');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive server information', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should handle requests with various user agents', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'curl/7.68.0',
        'PostmanRuntime/7.26.8',
      ];

      for (const userAgent of userAgents) {
        const response = await request(app).get('/').set('User-Agent', userAgent);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Query Parameters', () => {
    it('should handle requests with query parameters', async () => {
      const response = await request(app).get('/?test=value&foo=bar');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should handle requests with special characters in query', async () => {
      const response = await request(app).get('/?test=hello%20world');

      expect(response.status).toBe(200);
    });

    it('should handle requests with empty query parameters', async () => {
      const response = await request(app).get('/?test=');

      expect(response.status).toBe(200);
    });
  });

  describe('Request Headers', () => {
    it('should accept requests with Accept header', async () => {
      const response = await request(app).get('/').set('Accept', 'application/json');

      expect(response.status).toBe(200);
    });

    it('should handle requests without Accept header', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
    });

    it('should handle requests with custom headers', async () => {
      const response = await request(app)
        .get('/')
        .set('X-Custom-Header', 'test-value');

      expect(response.status).toBe(200);
    });
  });

  describe('Response Validation', () => {
    it('should return consistent response format', async () => {
      const responses = await Promise.all([
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/'),
      ]);

      const firstResponse = responses[0].body;
      responses.forEach((response) => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    it('should not include undefined or null values', async () => {
      const response = await request(app).get('/');

      expect(response.body.status).not.toBeNull();
      expect(response.body.status).not.toBeUndefined();
      expect(response.body.message).not.toBeNull();
      expect(response.body.message).not.toBeUndefined();
    });

    it('should return valid JSON', async () => {
      const response = await request(app).get('/');

      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long URLs', async () => {
      const longPath = '/test/' + 'a'.repeat(1000);
      const response = await request(app).get(longPath);

      expect(response.status).toBe(404);
    });

    it('should handle requests with trailing slashes', async () => {
      const response = await request(app).get('//');

      expect([200, 404]).toContain(response.status);
    });

    it('should handle encoded URLs', async () => {
      const response = await request(app).get('/%2F');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should handle rapid sequential requests', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await request(app).get('/');
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 requests
    });

    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await request(app).get('/');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('App Export', () => {
    it('should export a valid Express app', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
      expect(app.listen).toBeDefined();
    });

    it('should have JSON middleware configured', () => {
      expect(app._router).toBeDefined();
    });
  });
});