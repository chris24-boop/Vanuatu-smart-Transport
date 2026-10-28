import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post('register')
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() data: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(data.phone);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() data: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(
      data.phone,
      data.code,
      data.newPassword,
    );
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token required.');
    }
    const token = authorization.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token);
      return this.authService.getMe(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() data: LogoutDto) {
    return this.authService.revokeRefreshToken(data?.refreshToken);
  }

  @Get('status')
  status() {
    return { status: 'ready' };
  }
}