import { Client } from '@elastic/elasticsearch';
import { ISearchService, EmailIndexDocument } from '../types';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';

export const EMAIL_INDEX_NAME = 'reachinbox-emails';

export class ElasticsearchSearchService implements ISearchService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    const auth =
      ENV.ELASTICSEARCH_USERNAME && ENV.ELASTICSEARCH_PASSWORD
        ? {
            username: ENV.ELASTICSEARCH_USERNAME,
            password: ENV.ELASTICSEARCH_PASSWORD,
          }
        : undefined;

    this.client = new Client({
      node: ENV.ELASTICSEARCH_URL,
      auth,
      maxRetries: 2,
      requestTimeout: 3000,
    });
  }

  /**
   * Initializes Elasticsearch index with proper mappings
   */
  async initIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: EMAIL_INDEX_NAME });
      if (!exists) {
        await this.client.indices.create({
          index: EMAIL_INDEX_NAME,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                scheduleId: { type: 'keyword' },
                senderId: { type: 'keyword' },
                recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                errorMessage: { type: 'text' },
              },
            },
          },
        });
        console.log(`[Elasticsearch] Index '${EMAIL_INDEX_NAME}' created successfully.`);
      }
      this.isConnected = true;
    } catch (err: any) {
      this.isConnected = false;
      console.warn('[Elasticsearch] Could not connect or create index. Search will fallback to PostgreSQL:', err.message);
    }
  }

  /**
   * Index or update an email document in Elasticsearch
   */
  async indexEmailJob(doc: EmailIndexDocument): Promise<void> {
    if (!this.isConnected) return; // Silently skip if Elasticsearch is not running
    try {
      await this.client.index({
        index: EMAIL_INDEX_NAME,
        id: doc.id,
        document: doc,
      });
    } catch (err: any) {
      // PostgreSQL is source of truth; Elasticsearch is secondary
    }
  }

  /**
   * Performs full-text search across recipient, subject, and body, strictly scoped to userId
   */
  async searchEmails(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ total: number; hits: EmailIndexDocument[] }> {
    const from = (page - 1) * limit;

    try {
      const response = await this.client.search<EmailIndexDocument>({
        index: EMAIL_INDEX_NAME,
        from,
        size: limit,
        query: {
          bool: {
            must: [
              { term: { userId } },
              {
                multi_match: {
                  query,
                  fields: ['recipient^3', 'subject^2', 'body'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const hits = response.hits.hits.map((hit) => hit._source as EmailIndexDocument);

      return { total: totalHits, hits };
    } catch (err: any) {
      console.warn('[Elasticsearch] Search query failed, falling back to PostgreSQL query:', err.message);

      // Safe fallback to PostgreSQL full text query
      const whereCondition = {
        userId,
        OR: [
          { recipient: { contains: query, mode: 'insensitive' as const } },
          { subject: { contains: query, mode: 'insensitive' as const } },
          { body: { contains: query, mode: 'insensitive' as const } },
        ],
      };

      const [total, dbJobs] = await Promise.all([
        prisma.emailJob.count({ where: whereCondition }),
        prisma.emailJob.findMany({
          where: whereCondition,
          skip: from,
          take: limit,
          orderBy: { scheduledAt: 'desc' },
        }),
      ]);

      const hits: EmailIndexDocument[] = dbJobs.map((job) => ({
        id: job.id,
        userId: job.userId,
        scheduleId: job.scheduleId,
        senderId: job.senderId,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
        status: job.status as any,
        scheduledAt: job.scheduledAt.toISOString(),
        sentAt: job.sentAt ? job.sentAt.toISOString() : null,
        errorMessage: job.errorMessage,
      }));

      return { total, hits };
    }
  }
}

export const searchService = new ElasticsearchSearchService();
