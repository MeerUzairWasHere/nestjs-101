import * as argon2 from 'argon2';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { loginDto, registerDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(body: registerDto) {
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

  async login(body: loginDto) {
    const user = await this.userService.getUserByEmail(body.email);

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }
    const isPasswordCorrect = await argon2.verify(user.password, body.password);

    if (!isPasswordCorrect) {
      throw new NotFoundException('Invalid credentials');
    }

    return this.signToken({ userId: user.id, email: user.email });
  }

  signToken({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<string> {
    return this.jwtService.signAsync(
      { userId, email },
      {
        expiresIn: '15m',
        secret: this.config.get('JWT_SECRET'),
      },
    );
  }
}
