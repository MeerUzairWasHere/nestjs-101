import * as argon2 from 'argon2';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { signInDto, signUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signIn(body: signInDto, ip: string, userAgent: string) {
    const user = await this.userService.getUserByEmail(body.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordCorrect = await argon2.verify(user.password, body.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens({
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
    });
  }

  async signUp(body: signUpDto) {
    const hashedPassword = await argon2.hash(body.password);

    const userExists = await this.userService.getUserByEmail(body.email);

    if (userExists) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return this.generateTokens({ userId: user.id, email: user.email });
  }

  async generateTokens(payload: {
    userId: string;
    email: string;
    ip?: string;
    userAgent?: string;
  }) {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    // Store refresh token in database
    await this.prisma.token.create({
      data: {
        refreshToken,
        ip: payload.ip || '127.0.0.1',
        userAgent: payload.userAgent || 'Postman',
        userId: payload.userId,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // Check if token exists in database and is valid
      const tokenExists = await this.prisma.token.findFirst({
        where: {
          refreshToken,
          userId: payload.userId,
          isValid: true,
        },
      });

      if (!tokenExists) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const newAccessToken = await this.jwtService.signAsync(
        { userId: payload.userId, email: payload.email },
        {
          expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
          secret: this.config.get('JWT_ACCESS_SECRET'),
        },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async invalidateRefreshToken(refreshToken: string) {
    await this.prisma.token.updateMany({
      where: { refreshToken },
      data: { isValid: false },
    });
  }

  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });
  }

  attachTokensToResponse(
    res: Response,
    tokens: { accessToken: string; refreshToken?: string },
  ) {
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      signed: true,
      maxAge: this.config.get('JWT_ACCESS_EXPIRATION_MS'),
    });

    if (tokens.refreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: this.config.get('NODE_ENV') === 'production',
        signed: true,
        maxAge: this.config.get('JWT_REFRESH_EXPIRATION_MS'),
      });
    }
  }
}
