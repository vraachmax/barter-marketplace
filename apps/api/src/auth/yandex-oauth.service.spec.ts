import { YandexOAuthService } from './yandex-oauth.service';

describe('YandexOAuthService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      YANDEX_CLIENT_ID: 'client-id',
      YANDEX_CLIENT_SECRET: 'client-secret',
      WEB_APP_URL: 'https://barter.example',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('builds an authorization-code URL with state and PKCE', () => {
    const service = new YandexOAuthService();
    const url = new URL(
      service.buildAuthorizationUrl('state-value', 'challenge'),
    );

    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('code_challenge')).toBe('challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://barter.example/auth/yandex/callback-api',
    );
  });

  it('exchanges the code server-side and returns a Yandex profile', async () => {
    const calls: Array<Parameters<typeof fetch>> = [];
    const responses = [
      new Response(JSON.stringify({ access_token: 'provider-token' }), {
        status: 200,
      }),
      new Response(
        JSON.stringify({ id: '42', default_email: 'user@yandex.ru' }),
        { status: 200 },
      ),
    ];
    const fetchMock = jest.fn<typeof fetch>((...args) => {
      calls.push(args);
      return Promise.resolve(responses[calls.length - 1]);
    });
    global.fetch = fetchMock;

    const profile = await new YandexOAuthService().exchangeCodeForProfile(
      'auth-code',
      'verifier',
    );

    expect(profile).toEqual({ id: '42', default_email: 'user@yandex.ru' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calls[0][0]).toBe('https://oauth.yandex.ru/token');
    const tokenBody = calls[0][1]?.body;
    expect(tokenBody).toBeInstanceOf(URLSearchParams);
    expect((tokenBody as URLSearchParams).get('grant_type')).toBe(
      'authorization_code',
    );
    expect(calls[1][1]?.headers).toEqual({
      Authorization: 'OAuth provider-token',
    });
  });
});
