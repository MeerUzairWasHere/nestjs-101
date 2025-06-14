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
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { signInDto, signUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signIn(body: signInDto) {
    const user = await this.userService.getUserByEmail(body.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordCorrect = await argon2.verify(user.password, body.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken({ userId: user.id, email: user.email });
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

    return this.signToken({ userId: user.id, email: user.email });
  }

  async signToken({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<{
    accessToken: string;
  }> {
    const token = await this.jwtService.signAsync(
      { userId, email },
      {
        expiresIn: '15m',
        secret: this.config.get('JWT_SECRET'),
      },
    );
    return {
      accessToken: token,
    };
  }
}
