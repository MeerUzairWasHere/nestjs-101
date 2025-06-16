import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { TokenService } from 'src/token/token.service';
import { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // 1. Try to get tokens from signed cookies or headers
      const accessToken = this.getAccessToken(request);
      const refreshToken = this.getRefreshToken(request);

      // 2. If access token is valid, proceed
      if (accessToken) {
        try {
          const payload = await this.authService.verifyAccessToken(accessToken);
          // @ts-ignore
          request.user = payload; // Properly typed user attachment
          return true;
        } catch (accessTokenError) {
          // Only proceed to refresh if token is expired
          if (accessTokenError.name !== 'TokenExpiredError') {
            throw new UnauthorizedException('Invalid access token');
          }
        }
      }

      // 3. If no refresh token, fail
      if (!refreshToken) {
        throw new UnauthorizedException('No valid tokens provided');
      }

      // 4. Verify refresh token
      const refreshPayload =
        await this.authService.verifyRefreshToken(refreshToken);

      // 5. Check if refresh token exists in DB and is valid
      const existingToken = await this.tokenService.findValidToken(
        refreshPayload.userId,
        refreshToken,
      );

      if (!existingToken) {
        throw new UnauthorizedException('Refresh token not found or invalid');
      }

      // 6. Generate new access token
      const tokens = await this.authService.generateTokens({
        userId: refreshPayload.userId,
        email: refreshPayload.email,
      });

      // 7. Attach new tokens to response
      this.authService.attachTokensToResponse(response, {
        accessToken: tokens.accessToken,
        refreshToken, // Consider implementing refresh token rotation
      });

      // 8. Attach user to request
      // @ts-ignore
      request.user = {
        userId: refreshPayload.userId,
        email: refreshPayload.email,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private getAccessToken(request: Request): string | null {
    return (
      request.signedCookies?.accessToken ||
      request.headers.authorization?.split(' ')[1] ||
      null
    );
  }

  private getRefreshToken(request: Request): string | null {
    return request.signedCookies?.refreshToken || null;
  }
}
