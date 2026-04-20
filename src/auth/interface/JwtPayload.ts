export interface JwtPayload {
  sub: number;
  email: string;
  full_name?: string;
  role: string;
  seeker_id?: number;
}
