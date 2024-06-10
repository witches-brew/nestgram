import { IHandler, IUpdate, IWebhookConfig } from '../../types';
import { error } from '../../logger';
import { Handler } from './Handler';
import { Api } from '../Api';

import { IncomingMessage, ServerResponse } from 'http';
import * as http from 'http';

export class Webhook {
  api: Api = new Api(this.token);
  server: http.Server;

  handler: Handler = new Handler(
    this.token,
    this.handlers,
    this.logging,
    this.fileLogging,
    this.fileLoggingLimit,
  );

  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly config?: IWebhookConfig | null,
    private readonly logging?: boolean,
    private readonly fileLogging?: boolean,
    private readonly fileLoggingLimit?: number,
  ) {
    if (!this.token) throw error(`You can't run bot without token`);
    this.api.setWebhook(this.config);

    this.server = http
      .createServer(async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        try {
          let data: string = '';
          req.on('data', (chunk: string): any => (data += chunk));

          req.on('end', async (): Promise<any> => {
            try {
              // These endpoints are not designed to be called by Telegram, so
              // we don't want to guard them with the secret token.
              if (req.url === '/health') {
                res.end('ok');
                return;
              }

              // Endpoints below this assertion must come from Telegram.
              if (config.secret_token !== undefined) {
                assertSecretTokenHeader(req, config.secret_token);
              }

              const update: IUpdate = JSON.parse(data.toString());
              await this.handler.handleUpdate(update);
              res.end('ok');
            } catch (e: unknown) {
              if (e instanceof ForbiddenError) {
                res.statusCode = e.statusCode;
                res.end();
                return;
              }
              console.error(e);

              res.statusCode = 500;
              res.end();
            }
          });
        } catch (e: any) {
          throw error(e);
        }
      })
      .listen(config.port || 80);
  }
}

/**
 * Asserts that `request` has a header "X-Telegram-Bot-Api-Secret-Token" with
 * value `expectedToken`. `expectedToken` should be the `secret_token` sent to
 * Telegram when registering this webhook.
 *
 * This is a security measure, which ensures that Telegram is making this
 * request. This makes it impossible for anyone else to make requests to this
 * service.
 */
function assertSecretTokenHeader(request: IncomingMessage, expectedToken: string): void {
  // NodeJS lowercases header names by default:
  // https://nodejs.org/api/http.html#messageheaders
  let header = request.headers['x-telegram-bot-api-secret-token'];

  if (header === undefined) throw new ForbiddenError();
  if (Array.isArray(header)) {
    if (header.length !== 1) throw new ForbiddenError();
    header = header[0];
  }

  if (header !== expectedToken) throw new ForbiddenError();
}

class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
  }
}
