export class CoachProfileResponse {
  id: string;
  email: string;
  displayName: string;
}

export class AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  coach: CoachProfileResponse;
}

export class RefreshAccessTokenResponse {
  accessToken: string;
  expiresInSeconds: number;
}
