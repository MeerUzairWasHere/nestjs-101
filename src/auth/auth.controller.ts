import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginDto, registerDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: registerDto) {
    return this.authService.register(body);
  }

  @HttpCode(200)
  @Post('login')
  login(@Body() body: loginDto) {
    return this.authService.login(body);
  }
}
