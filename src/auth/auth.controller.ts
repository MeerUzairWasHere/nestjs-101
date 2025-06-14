import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { signInDto, signUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @HttpCode(200)
  @Post('signin')
  login(@Body() body: signInDto) {
    return this.authService.signIn(body);
  }

  @Post('signup')
  register(@Body() body: signUpDto) {
    return this.authService.signUp(body);
  }
}
