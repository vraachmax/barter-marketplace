import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();

    if (exception.code === 'P2022') {
      this.logger.error(`DB schema mismatch (missing column): ${exception.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          'База данных не совпадает со схемой (нет колонки). Выполните в папке apps/api: npx prisma migrate deploy',
        code: 'db_schema_out_of_date',
      });
    }

    this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: exception.code,
    });
  }
}
