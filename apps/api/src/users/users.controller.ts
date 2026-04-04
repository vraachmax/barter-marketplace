import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.users.publicProfile(id);
  }
}

