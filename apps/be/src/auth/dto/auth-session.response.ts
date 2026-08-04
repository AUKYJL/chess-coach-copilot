export class CoachProfileResponse {
  id: string;
  email: string;
  displayName: string;
}

export class AuthResponse {
  accessToken: string;
  coach: CoachProfileResponse;
}

export class RefreshAccessTokenResponse {
  accessToken: string;
}
