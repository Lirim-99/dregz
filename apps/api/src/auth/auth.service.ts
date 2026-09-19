import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  login(password: string): { accessToken: string } {
    const expected =
      this.config.get<string>('ADMIN_PASSWORD') || 'kosovarepublik99';
    if (password !== expected) {
      throw new UnauthorizedException('Fjalëkalim i pavlefshëm');
    }
    const accessToken = this.jwt.sign({ role: 'admin', sub: 'admin' });
    return { accessToken };
  }
}
