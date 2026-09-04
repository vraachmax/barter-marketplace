import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type YandexTokenResponse = {
  access_token?: string;
};

export type YandexProfile = {
  id: string;
  default_email?: string;
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class YandexOAuthService {
  isConfigured(): boolean {
    return Boolean(
      process.env.YANDEX_CLIENT_ID?.trim() &&
      process.env.YANDEX_CLIENT_SECRET?.trim(),
    );
  }

  getWebAppUrl(): string {
    const configured =
      process.env.WEB_APP_URL?.trim() ||
      process.env.CORS_ORIGINS?.split(',')[0]?.trim() ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3000');

    if (!configured) {
      throw new ServiceUnavailableException('web_app_url_not_configured');
    }

    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ServiceUnavailableException('web_app_url_invalid');
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new ServiceUnavailableException('web_app_url_must_be_https');
    }
    return url.origin;
  }

  getRedirectUri(): string {
    return (
      process.env.YANDEX_REDIRECT_URI?.trim() ||
      `${this.getWebAppUrl()}/auth/yandex/callback-api`
    );
  }

  buildAuthorizationUrl(state: string, codeChallenge: string): string {
    const clientId = process.env.YANDEX_CLIENT_ID?.trim();
    if (!clientId || !process.env.YANDEX_CLIENT_SECRET?.trim()) {
      throw new ServiceUnavailableException('yandex_oauth_not_configured');
    }

    const url = new URL('https://oauth.yandex.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', this.getRedirectUri());
    url.searchParams.set('scope', 'login:info login:email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCodeForProfile(
    code: string,
    codeVerifier: string,
  ): Promise<YandexProfile> {
    const clientId = process.env.YANDEX_CLIENT_ID?.trim();
    const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('yandex_oauth_not_configured');
    }

    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      throw new BadGatewayException('yandex_token_exchange_failed');
    }
    const token = (await tokenResponse.json()) as YandexTokenResponse;
    if (!token.access_token) {
      throw new BadGatewayException('yandex_token_missing');
    }

    const profileResponse = await fetch(
      'https://login.yandex.ru/info?format=json',
      {
        headers: { Authorization: `OAuth ${token.access_token}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!profileResponse.ok) {
      throw new BadGatewayException('yandex_profile_failed');
    }

    const profile = (await profileResponse.json()) as YandexProfile;
    if (!profile.id || !profile.default_email) {
      throw new BadGatewayException('yandex_profile_incomplete');
    }
    return profile;
  }
}
