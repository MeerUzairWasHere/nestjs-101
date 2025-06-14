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

  // async login(body: loginDto, req: Request, res: Response) {
  //   const { email, password } = body;

  //   // Step 1: Find user by email
  //   const user = await this.userService.getUserByEmail(email);
  //   if (!user) {
  //     throw new UnauthorizedException('Invalid Credentials');
  //   }

  //   // Step 2: Compare passwords
  //   const isPasswordCorrect = await argon2.verify(user.password, password);
  //   if (!isPasswordCorrect) {
  //     throw new UnauthorizedException('Invalid Credentials');
  //   }

  //   // Step 3: Verify user's email status
  //   if (!user.isVerified) {
  //     throw new UnauthorizedException('Please verify your email');
  //   }

  //   // Step 4: Create token payload for the user
  //   const tokenUser = { userId: user.id, email: user.email };

  //   // Step 5: Check for existing token or create a new one
  //   let refreshToken: string;
  //   const existingToken = await this.prisma.token.findFirst({
  //     where: {
  //       userId: user.id,
  //     },
  //   });

  //   // if (existingToken) {
  //   //   if (!existingToken.isValid) {
  //   //     throw new UnauthorizedException('Invalid Credentials');
  //   //   }
  //   //   refreshToken = existingToken.refreshToken;
  //   // } else {
  //   //   refreshToken = randomBytes(40).toString('hex');

  //   //   const userAgent = req.headers['user-agent'] || 'unknown';
  //   //   const ip = req.ip;
  //   //   if (!ip) {
  //   //     throw new BadRequestException('IP address is required');
  //   //   }
  //   //   await this.tokenService.createToken({
  //   //     refreshToken,
  //   //     ip,
  //   //     userAgent,
  //   //     userId: user.id,
  //   //   });
  //   // }

  //   // Step 6: Attach cookies and respond
  //   // attachCookiesToResponse({ res, user: tokenUser, refreshToken });

  //   // Also return the signed JWT in the response
  //   const accessToken = await this.signToken(tokenUser);

  //   return {
  //     user: tokenUser,
  //     accessToken,
  //   };
  // }

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
