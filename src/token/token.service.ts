import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(private prisma: PrismaService) {}

  async findValidToken(userId: string, refreshToken: string) {
    return this.prisma.token.findFirst({
      where: {
        userId,
        refreshToken,
        isValid: true,
      },
    });
  }
}
