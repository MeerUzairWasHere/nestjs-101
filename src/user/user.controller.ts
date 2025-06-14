import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UserController {
  constructor() {}

  @Get('me')
  getUser() {
    return 'user info';
  }
}
