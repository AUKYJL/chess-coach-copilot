import { ApiProperty } from '@nestjs/swagger';

export class CoachProfileResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  displayName: string;
}

export class AuthResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: () => CoachProfileResponse })
  coach: CoachProfileResponse;
}

export class RefreshAccessTokenResponse {
  @ApiProperty()
  accessToken: string;
}
