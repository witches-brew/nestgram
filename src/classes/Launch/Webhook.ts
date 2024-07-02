import { IRunConfig, IUpdate, IWebhookConfig } from '../../types';
import { error, info } from '../../logger';
import { Handler } from './Handler';
import { Api } from '../Api';

import { IncomingMessage, ServerResponse } from 'http';
import * as http from 'http';

export class Webhook {
  constructor(
    private readonly api: Api,
    private readonly webhookConfig: IWebhookConfig,
    private readonly runConfig: IRunConfig,
    private readonly handler: Handler,
  ) {}

  async start(): Promise<void> {
    await this.registerWebhookIfNecessary();

    http
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
              if (this.webhookConfig.secret_token !== undefined) {
                assertSecretTokenHeader(req, this.webhookConfig.secret_token);
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
      .listen(this.webhookConfig.port || 80);
  }

  private registerWebhookIfNecessary(): Promise<void> {
    return this.api
      .getWebhookInfo()
      .then((webhookInfo) => {
        // We only want to re-register the webhook if the URL differs from the
        // one in our config...
        if (webhookInfo.url !== this.webhookConfig.url) return;
        if (this.runConfig.logging) info('Re-registering webhook...');

        return this.api.setWebhook(this.webhookConfig);
      })
      .then(() => {});
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
