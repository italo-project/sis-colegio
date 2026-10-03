import { env } from '../../config/env';

const MP_BASE_URL = 'https://api.mercadopago.com';

type OAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number;
  expires_in: number;
  scope: string;
  token_type: string;
};

type MPUserResponse = {
  id: number;
  nickname: string;
  email: string;
  country_id: string;
  site_id: string;
};

type MPPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

type MPPaymentResponse = {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  payment_method_id: string;
  external_reference: string | null;
  date_approved: string | null;
};

/**
 * Intercambia el `code` de OAuth por tokens de acceso del colegio.
 */
export const exchangeOAuthCode = async (code: string): Promise<OAuthTokenResponse> => {
  const params = new URLSearchParams({
    client_id: env.MP_CLIENT_ID,
    client_secret: env.MP_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.MP_REDIRECT_URI,
  });

  const res = await fetch(`${MP_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP OAuth error ${res.status}: ${text}`);
  }

  return (await res.json()) as OAuthTokenResponse;
};

/**
 * Renueva el access_token del colegio usando el refresh_token.
 */
export const refreshAccessToken = async (
  refreshToken: string,
): Promise<OAuthTokenResponse> => {
  const params = new URLSearchParams({
    client_id: env.MP_CLIENT_ID,
    client_secret: env.MP_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(`${MP_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP refresh error ${res.status}: ${text}`);
  }

  return (await res.json()) as OAuthTokenResponse;
};

/**
 * Obtiene los datos del usuario de MP dado un access_token.
 */
export const getMPUser = async (accessToken: string): Promise<MPUserResponse> => {
  const res = await fetch(`${MP_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP user error ${res.status}: ${text}`);
  }

  return (await res.json()) as MPUserResponse;
};

/**
 * Construye la URL de autorización a la que se redirige al colegio.
 */
export const buildAuthorizationUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: env.MP_CLIENT_ID,
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: env.MP_REDIRECT_URI,
    state,
  });

  return `https://auth.mercadopago.com.pe/authorization?${params.toString()}`;
};

/**
 * Crea una preferencia de pago en nombre del colegio.
 * `marketplaceFee` es la comisión de tu plataforma (en soles).
 */
export const createPreference = async (
  accessToken: string,
  payload: {
    items: Array<{
      id: string;
      title: string;
      description?: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
    }>;
    externalReference: string;
    notificationUrl: string;
    backUrls: {
      success: string;
      failure: string;
      pending: string;
    };
    marketplaceFee: number;
    payer?: {
      email?: string;
      name?: string;
      surname?: string;
    };
  },
): Promise<MPPreferenceResponse> => {
  const body = {
    items: payload.items,
    external_reference: payload.externalReference,
    notification_url: payload.notificationUrl,
    back_urls: payload.backUrls,
    auto_return: 'approved',
    marketplace_fee: payload.marketplaceFee,
    payer: payload.payer,
    statement_descriptor: 'SISTEMA COLEGIOS',
  };

  const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP preference error ${res.status}: ${text}`);
  }

  return (await res.json()) as MPPreferenceResponse;
};

/**
 * Consulta un pago por su ID.
 */
export const getPayment = async (
  accessToken: string,
  paymentId: string,
): Promise<MPPaymentResponse> => {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MP payment error ${res.status}: ${text}`);
  }

  return (await res.json()) as MPPaymentResponse;
};