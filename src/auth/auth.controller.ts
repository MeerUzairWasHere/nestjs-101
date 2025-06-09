import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: AuthDto) {
    console.log(body);
    return this.authService.login();
  }

  @Post('register')
  register() {
    return this.authService.register();
  }
}
